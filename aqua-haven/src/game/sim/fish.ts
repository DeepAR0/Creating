import { BAL, levelScale } from '../balance';
import { getSpecies } from '../../data/species';
import type { FishState, SpeciesDef, TankState } from '../types';
import type { TankEnv } from './env';
import type { SimHost } from './host';
import { clamp, chance, rand } from '../util';

export type MoodKey =
  | 'fed'
  | 'hungry'
  | 'starving'
  | 'cleanWater'
  | 'dirtyWater'
  | 'goodTemp'
  | 'badTemp'
  | 'lowO2'
  | 'school'
  | 'alone'
  | 'hides'
  | 'noHides'
  | 'needsDecor'
  | 'bullied'
  | 'rivals'
  | 'nipped'
  | 'beauty'
  | 'plants'
  | 'sick'
  | 'algae'
  | 'dirt'
  | 'crowded';

export interface MoodReason {
  k: MoodKey;
  d: number;
}

export function trait(sp: SpeciesDef, id: string): number {
  const t = sp.traits.find((x) => x.id === id);
  return t ? (t.v ?? 1) : 0;
}

export function hasTrait(sp: SpeciesDef, id: string): boolean {
  return sp.traits.some((x) => x.id === id);
}

export function tempDistance(sp: SpeciesDef, temp: number): number {
  if (temp < sp.temp[0]) return sp.temp[0] - temp;
  if (temp > sp.temp[1]) return temp - sp.temp[1];
  return 0;
}

/** Mutluluk hedefini ve nedenlerini hesaplar */
export function moodFor(f: FishState, sp: SpeciesDef, t: TankState, env: TankEnv): { target: number; reasons: MoodReason[] } {
  const reasons: MoodReason[] = [];
  const add = (k: MoodKey, d: number) => {
    if (Math.abs(d) >= 0.5) reasons.push({ k, d: Math.round(d) });
  };
  const q = 100 - t.pollution;

  if (f.food <= 0) add('starving', -25);
  else if (f.food < 25) add('hungry', -15);
  else if (f.food > 60) add('fed', 10);

  const hardy = hasTrait(sp, 'hardy') ? 0.5 : 1;
  if (q >= sp.minQ + 10) add('cleanWater', 8);
  else if (q < sp.minQ) add('dirtyWater', -Math.min(45, (sp.minQ - q) * 1.2 * hardy));

  const td = tempDistance(sp, t.temp);
  if (td <= 0) add('goodTemp', 8);
  else add('badTemp', -Math.min(40, td * 7));

  if (t.oxygen < 40) add('lowO2', -(40 - t.oxygen));

  if (sp.school) {
    const n = env.counts[f.sp] ?? 1;
    if (n >= sp.school) add('school', 10);
    else add('alone', n <= 1 ? -20 : -10);
  }

  if (hasTrait(sp, 'shy')) add(env.hides ? 'hides' : 'noHides', env.hides ? 6 : -14);
  if (sp.needsDecor && !env.decorIds.has(sp.needsDecor)) add('needsDecor', -25);

  if (sp.temper === 'peaceful' || hasTrait(sp, 'shy')) {
    const size = sp.size * (0.35 + 0.65 * f.g);
    if (env.territorial.some((x) => x.sp !== f.sp && x.size > size * 0.8)) add('bullied', -12);
  }
  if (hasTrait(sp, 'rivalMales') && f.sex === 'M' && (env.males[f.sp] ?? 0) >= 2) add('rivals', -30);
  if (hasTrait(sp, 'longFin') && env.finNipper) add('nipped', -15);

  add('beauty', Math.min(10, env.decorBeauty / 15));
  add('plants', Math.min(6, env.plantCount * 1.2));
  if (f.sick) add('sick', -20);
  if (env.avgAlgae > 0.5) add('algae', -5);
  if (t.dirt > 60) add('dirt', -6);
  if (env.used > env.cap) add('crowded', -20);

  const target = clamp(65 + reasons.reduce((s, r) => s + r.d, 0), 0, 100);
  return { target, reasons };
}

export function growthRate(f: FishState, sp: SpeciesDef, t: TankState): number {
  if (f.g >= 1) return 0;
  const sat = f.food >= BAL.GROW_MIN_FOOD ? 1 : f.food / BAL.GROW_MIN_FOOD;
  const joy = 0.5 + f.joy / 200;
  const hp = f.hp >= 50 ? 1 : 0.3 + (0.7 * f.hp) / 50;
  const temp = Math.max(0.3, 1 - tempDistance(sp, t.temp) * 0.15);
  const fast = 1 + trait(sp, 'fastGrow');
  const boost = f.boost && f.boost > 0 ? 1 + (f.boostAmt ?? 0) : 1;
  const sick = f.sick ? 0.5 : 1;
  return (1 / sp.growTime) * sat * joy * hp * temp * fast * boost * sick;
}

/** Yetişkinliğe tahmini kalan süre (ideal koşullarda) */
export function timeToAdult(f: FishState, sp: SpeciesDef, t: TankState): number {
  const r = growthRate(f, sp, t);
  if (f.g >= 1) return 0;
  if (r <= 0) return Infinity;
  return (1 - f.g) / r;
}

/** Tek bir canlının dt saniyelik güncellemesi */
export function updateFish(host: SimHost, t: TankState, env: TankEnv, f: FishState, dt: number) {
  const sp = getSpecies(f.sp);
  const s = host.state;
  const protectedLvl = s.player.level < BAL.PROTECT_LEVEL;

  // Açlık
  const metab = 1 + (t.temp - 24) * 0.03;
  f.food = Math.max(0, f.food - (dt * 100 * metab) / sp.hunger);

  // Mutluluk (yumuşatılmış)
  const { target } = moodFor(f, sp, t, env);
  f.joy += (target - f.joy) * Math.min(1, dt / 20);

  // Sağlık
  const q = 100 - t.pollution;
  const td = tempDistance(sp, t.temp);
  let dhp = 0; // dakikada
  let bad = false;
  if (f.food <= 0) { dhp -= BAL.STARVE_DMG_PER_MIN; bad = true; }
  if (td > 2) { dhp -= (td - 2) * 0.4; bad = true; }
  if (q < sp.minQ - 25) { dhp -= (sp.minQ - 25 - q) * 0.05 * (hasTrait(sp, 'hardy') ? 0.5 : 1); bad = true; }
  if (t.oxygen < 20) { dhp -= (20 - t.oxygen) * 0.1; bad = true; }
  if (f.sick) { dhp -= BAL.SICK_DMG_PER_MIN; bad = true; }
  if (!bad && f.food > 30) dhp += BAL.HEAL_PER_MIN;
  dhp += env.healer * 0.5;
  f.hp = clamp(f.hp + (dhp * dt) / 60, 0, 100);

  const floor = host.offline ? BAL.OFFLINE_HP_FLOOR : protectedLvl ? 5 : 0;
  if (f.hp < floor) f.hp = floor;
  // Kritik durum: sağlık 0'da kalırsa bir süre sonra ölür (yalnızca çevrimiçi)
  f.crit = f.hp <= 0 ? (f.crit ?? 0) + dt : 0;

  // Büyüme
  if (f.g < 1) {
    const before = f.g;
    f.g = Math.min(1, f.g + growthRate(f, sp, t) * dt);
    if (before < 1 && f.g >= 1) {
      f.adultAt = Date.now();
      host.addXp(sp.adultXp * xpMult(host, sp, env), f.id);
      host.state.stats.grown++;
      host.progress('grow', 1);
      host.emit('fishAdult', { tankId: t.id, fish: f });
    }
  }
  if (f.boost && f.boost > 0) {
    f.boost = Math.max(0, f.boost - dt);
    if (f.boost === 0) f.boostAmt = 0;
  }
  if (f.cd && f.cd > 0) f.cd = Math.max(0, f.cd - dt);

  // Hastalık (dakikalık olasılık → dt'ye ölçekli)
  if (!protectedLvl && !f.sick) {
    let stress = 0;
    if (q < sp.minQ - 10) stress += (sp.minQ - 10 - q) / 30;
    if (td > 2) stress += (td - 2) / 4;
    if (t.oxygen < 25) stress += 0.5;
    if (f.joy < 25) stress += 0.3;
    let p = BAL.SICK_BASE_CHANCE * stress * env.sickMult * (hasTrait(sp, 'hardy') ? 0.5 : 1);
    if (env.sick > 0) p += BAL.CONTAGION * env.sick * env.sickMult;
    if (p > 0 && chance((p * dt) / 60)) {
      f.sick = 1;
      host.emit('fishSick', { tankId: t.id, fish: f });
    }
  } else if (f.sick && env.healer > 0 && chance((0.1 * env.healer * dt) / 60)) {
    f.sick = 0;
  }

  // Şans baloncuğu
  const luckV = trait(sp, 'lucky');
  if (luckV > 0 && f.g >= 0.4) {
    f.luck = (f.luck ?? BAL.LUCKY_INTERVAL) - dt;
    if (f.luck <= 0) {
      f.luck = (BAL.LUCKY_INTERVAL / luckV) * rand(0.7, 1.3);
      const coins = Math.round((15 + s.player.level * 12) * luckV * rand(0.8, 1.2));
      const pearls = chance(0.1 * luckV) ? 1 : 0;
      if (!host.offline && host.activeTankId() === t.id) {
        host.emit('lucky', { tankId: t.id, fishId: f.id, coins, pearls });
      } else {
        t.tips += coins * 0.5;
      }
    }
  }
}

export function xpMult(host: SimHost, sp: SpeciesDef, env: TankEnv): number {
  const vip = host.state.iap.vipUntil > Date.now() ? 1 + BAL.VIP_XP : 1;
  return (1 + trait(sp, 'xpBoost')) * (1 + env.aura) * vip;
}

/** Görev ve günlük ödüllerin seviye ölçeği */
export function rewardScale(level: number) {
  return levelScale(level);
}
