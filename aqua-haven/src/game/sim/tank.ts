import { BAL } from '../balance';
import { getSpecies } from '../../data/species';
import { getPlant } from '../../data/plants';
import { getDecor } from '../../data/decor';
import { getEquip } from '../../data/equipment';
import { getFood } from '../../data/foods';
import type { TankState } from '../types';
import { computeEnv, tempRange, type TankEnv } from './env';
import { updateFish, xpMult } from './fish';
import { updateClutches } from './breeding';
import { tipCap, tipRatePerMin } from './economy';
import type { SimHost } from './host';
import { clamp, hashString, mulberry32 } from '../util';

const proneCache = new Map<string, Float32Array>();

/** Her tank için sabit "yosun eğilimi" haritası (yamalar halinde büyüsün diye) */
function proneness(t: TankState): Float32Array {
  let p = proneCache.get(t.id);
  if (p) return p;
  const rng = mulberry32(hashString(t.id));
  const C = BAL.ALGAE_COLS;
  const R = BAL.ALGAE_ROWS;
  p = new Float32Array(C * R);
  // birkaç rastgele odak noktası
  const foci = Array.from({ length: 5 }, () => ({ x: rng() * C, y: rng() * R, r: 2 + rng() * 4 }));
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      let v = 0.25 + rng() * 0.2;
      for (const f of foci) {
        const d = Math.hypot(c - f.x, (r - f.y) * 1.3);
        v += Math.max(0, 1 - d / f.r) * 1.1;
      }
      // ışığa yakın üst kısım ve köşeler daha yatkın
      v *= 0.85 + (1 - r / R) * 0.35;
      p[r * C + c] = Math.min(1.8, v);
    }
  }
  proneCache.set(t.id, p);
  return p;
}

function updateAlgae(t: TankState, env: TankEnv, dt: number) {
  const C = BAL.ALGAE_COLS;
  const R = BAL.ALGAE_ROWS;
  const a = t.algae;
  const prone = proneness(t);
  if (t.light) {
    const shade = 1 - Math.min(0.3, env.floating * 0.1) - Math.min(0.35, env.plantCount * 0.03);
    const base = BAL.ALGAE_RATE * env.algaeMult * (0.4 + t.pollution / 100) * shade * dt;
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const i = r * C + c;
        const n =
          ((c > 0 ? a[i - 1] : 0) + (c < C - 1 ? a[i + 1] : 0) + (r > 0 ? a[i - C] : 0) + (r < R - 1 ? a[i + C] : 0)) / 4;
        const infl = Math.max(a[i], n);
        a[i] = Math.min(1, a[i] + base * prone[i] * (0.25 + 0.75 * infl) * (1.05 - a[i] * 0.5));
      }
    }
  }
  // Yosun yiyiciler: en yoğun hücrelerden yer
  if (env.algaeEater > 0) {
    let eat = env.algaeEater * BAL.ALGAE_EAT * (BAL.NANO_AREA / env.area) * dt;
    for (let k = 0; k < 6 && eat > 0; k++) {
      const i = Math.floor(Math.random() * a.length);
      let best = i;
      for (let j = 0; j < 8; j++) {
        const q = Math.floor(Math.random() * a.length);
        if (a[q] > a[best]) best = q;
      }
      const take = Math.min(a[best], eat / (6 - k));
      a[best] -= take;
      eat -= take;
    }
  }
}

function updateWater(t: TankState, env: TankEnv, dt: number, offline: boolean) {
  // Sıcaklık
  const [minT, maxT] = tempRange(env);
  t.targetTemp = clamp(t.targetTemp, minT, maxT);
  const diff = t.targetTemp - t.temp;
  const step = BAL.TEMP_RATE * dt;
  t.temp = Math.abs(diff) <= step ? t.targetTemp : t.temp + Math.sign(diff) * step;

  // Kirlilik (su kalitesi = 100 - kirlilik)
  const waste = env.ratio * BAL.POLLUTION_K * (1 - env.filterEff);
  const fromDirt = t.dirt * BAL.DIRT_POLLUTION;
  const plants = env.plantClean / 3600;
  const before = t.pollution;
  t.pollution = clamp(t.pollution + (waste + fromDirt - plants) * dt, 0, 100);
  // Çevrimdışıyken kirlilik belli bir sınırın üstüne çıkmaz (oyuncu dönünce toparlayabilsin)
  if (offline && t.pollution > before && t.pollution > BAL.OFFLINE_POLLUTION_CAP) {
    t.pollution = Math.max(before, BAL.OFFLINE_POLLUTION_CAP);
  }

  // Dip kiri
  const dirtIn = env.ratio * BAL.DIRT_K;
  const dirtOut = (env.dirtClean + env.scavenger * BAL.SCAVENGER_DIRT) / 3600;
  t.dirt = clamp(t.dirt + (dirtIn - dirtOut) * dt, 0, 100);

  // Oksijen
  const tempF = 1 + (t.temp - 24) * 0.03;
  const target = clamp(BAL.O2_BASE + env.o2Prod - env.ratio * BAL.O2_CONSUMPTION * tempF, 5, 100);
  t.oxygen += (target - t.oxygen) * Math.min(1, BAL.O2_RATE * dt);
}

function updatePlants(t: TankState, env: TankEnv, dt: number) {
  if (!t.light) return;
  for (const p of t.plants) {
    if (p.g >= 1) continue;
    const def = getPlant(p.def);
    const lightF = env.light >= def.light ? 1 + 0.5 * (env.light - 1) : 0.25;
    const q = (100 - t.pollution) / 100;
    p.g = Math.min(1, p.g + (dt / def.growTime) * lightF * env.plantMult * (0.6 + 0.4 * q));
  }
}

function updateFeeder(host: SimHost, t: TankState, env: TankEnv, dt: number) {
  const tier = t.equip.feeder ?? 0;
  if (!tier) return;
  const eq = getEquip('feeder', tier);
  if (!eq?.interval) return;
  t.feederT += dt;
  if (t.feederT < eq.interval) return;
  t.feederT = 0;
  if (!t.fish.length) return;
  const s = host.state;
  // Seçili yem yoksa elde olan herhangi bir yemi kullan (altın mama hariç)
  let foodId = s.selectedFood;
  if (!(s.inv.food[foodId] > 0)) {
    foodId = Object.keys(s.inv.food).find((k) => k !== 'golden' && s.inv.food[k] > 0) ?? '';
  }
  if (!foodId) return;
  const pinches = Math.min(s.inv.food[foodId], Math.ceil(t.fish.length / 3));
  s.inv.food[foodId] -= pinches;
  const online = !host.offline && host.activeTankId() === t.id;
  if (online) {
    host.emit('feederFed', { tankId: t.id, food: foodId });
    return;
  }
  // Ekranda değilken istatistiksel besleme
  const food = getFood(foodId);
  for (const f of t.fish) {
    const sp = getSpecies(f.sp);
    if (f.food > 85) continue;
    const gain = food.nutrition * food.diet[sp.diet] * 3;
    f.food = Math.min(100, f.food + gain);
    host.addXp(sp.xp * food.xpMult * 2 * xpMult(host, sp, env));
    if (food.boost > 0) {
      f.boost = Math.max(f.boost ?? 0, food.boostTime);
      f.boostAmt = Math.max(f.boostAmt ?? 0, food.boost);
    }
  }
}

function updateDecor(host: SimHost, t: TankState, dt: number) {
  for (const d of t.decor) {
    const def = getDecor(d.def);
    if (def.pearlGen) {
      d.gen = Math.min(def.pearlGen, (d.gen ?? 0) + dt);
      if (d.gen >= def.pearlGen && !host.state.flags[`pearlReady:${d.id}`]) {
        host.state.flags[`pearlReady:${d.id}`] = 1;
        host.emit('pearlMade', { tankId: t.id, decorId: d.id });
      }
    }
  }
}

/** Bir tankı dt saniye ilerletir */
export function updateTank(host: SimHost, t: TankState, dt: number): TankEnv {
  const env = computeEnv(t);
  updateWater(t, env, dt, host.offline);
  updateAlgae(t, env, dt);
  updatePlants(t, env, dt);
  for (const f of t.fish) updateFish(host, t, env, f, dt);

  // Ölüm kontrolü
  for (let i = t.fish.length - 1; i >= 0; i--) {
    const f = t.fish[i];
    if ((f.crit ?? 0) >= BAL.CRIT_DEATH_SEC) {
      t.fish.splice(i, 1);
      host.emit('fishDied', { tankId: t.id, fish: f });
      host.emit('fishRemoved', { tankId: t.id, fishId: f.id, reason: 'died' });
    }
  }

  updateClutches(host, t, env, dt);
  updateFeeder(host, t, env, dt);
  updateDecor(host, t, dt);

  // Ziyaretçi geliri
  const rate = tipRatePerMin(host.state, t, env);
  const cap = tipCap(host.state, t, env);
  if (t.tips < cap) t.tips = Math.min(cap, t.tips + (rate / 60) * dt);
  return env;
}
