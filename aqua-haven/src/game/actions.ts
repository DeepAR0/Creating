import { BAL } from './balance';
import type { Game } from './game';
import { SPECIES, getSpecies } from '../data/species';
import { getPlant } from '../data/plants';
import { getDecor } from '../data/decor';
import { getEquip } from '../data/equipment';
import { EGG_ODDS, getFood, getItem } from '../data/foods';
import { getCosmetic, getTankType, getTier } from '../data/tanks';
import { capacityFree, createFish, createTank, findFish, tankById } from './state';
import type { EquipSlot, FishState, Rarity, Sex, SpeciesDef, TankState } from './types';
import { computeEnv } from './sim/env';
import { hasTrait, trait, xpMult } from './sim/fish';
import { breedPearlCost, growPearlCost, pearlCoinRate, quickCleanCost, sellValue, waterChangeCost } from './sim/economy';
import { startBreeding } from './sim/breeding';
import { clamp, uid, weightedPick } from './util';

export type ErrCode =
  | 'coins'
  | 'pearls'
  | 'level'
  | 'capacity'
  | 'water'
  | 'tier'
  | 'noFood'
  | 'favorite'
  | 'notAdult'
  | 'noItem'
  | 'max'
  | 'notReady'
  | 'exclusive'
  | 'invalid';

export interface Result<T = undefined> {
  ok: boolean;
  err?: ErrCode;
  value?: T;
}

const ok = <T>(value?: T): Result<T> => ({ ok: true, value });
const fail = <T = undefined>(err: ErrCode): Result<T> => ({ ok: false, err });

function payFor(g: Game, coins: number, pearls: number): ErrCode | null {
  if (g.state.player.coins < coins) return 'coins';
  if (g.state.player.pearls < pearls) return 'pearls';
  g.spend(coins, pearls);
  return null;
}

// ------------------------------------------------------------------ canlılar

export function canBuySpecies(g: Game, sp: SpeciesDef, tank: TankState = g.tank): ErrCode | null {
  if (sp.exclusive) return 'exclusive';
  if (sp.level > g.state.player.level) return 'level';
  if (sp.water !== tank.type) return 'water';
  if ((sp.minTier ?? 0) > tank.tier) return 'tier';
  if (capacityFree(tank) < sp.bioload) return 'capacity';
  return null;
}

export function buySpecies(g: Game, spId: string, sex?: Sex): Result<FishState> {
  const sp = getSpecies(spId);
  const tank = g.tank;
  const err = canBuySpecies(g, sp, tank);
  if (err) return fail(err);
  const payErr = payFor(g, sp.pearls ? 0 : sp.price, sp.pearls ?? 0);
  if (payErr) return fail(payErr);
  const fish = createFish(g.state, spId, g.lang(), { sex: sp.breed ? sex : undefined });
  tank.fish.push(fish);
  if (!g.state.discovered[spId]) g.state.discovered[spId] = Date.now();
  g.state.stats.bought++;
  g.progress('buyFish', 1);
  g.emit('fishAdded', { tankId: tank.id, fish, source: 'buy' });
  return ok(fish);
}

/** Hediye/özel canlı ekler (başlangıç paketi, yumurta) — kapasite yoksa false */
export function giftSpecies(g: Game, spId: string, source: 'gift' | 'egg' = 'gift'): FishState | null {
  const sp = getSpecies(spId);
  const tank = g.state.tanks.find((t) => t.type === sp.water && capacityFree(t) >= sp.bioload && (sp.minTier ?? 0) <= t.tier);
  if (!tank) return null;
  const fish = createFish(g.state, spId, g.lang(), { g: 0.1 });
  tank.fish.push(fish);
  if (!g.state.discovered[spId]) g.state.discovered[spId] = Date.now();
  g.emit('fishAdded', { tankId: tank.id, fish, source });
  return fish;
}

export function sellFish(g: Game, fishId: string): Result<number> {
  const found = findFish(g.state, fishId);
  if (!found) return fail('invalid');
  const { tank, fish } = found;
  if (fish.fav) return fail('favorite');
  const sp = getSpecies(fish.sp);
  const value = sellValue(g.state, fish);
  tank.fish = tank.fish.filter((f) => f.id !== fishId);
  tank.clutches = tank.clutches.filter((c) => !(c.stage === 'court' && c.parents.includes(fishId)));
  g.addCoins(value, true);
  const env = computeEnv(tank);
  g.addXp(sp.adultXp * BAL.SELL_XP_MULT * fish.g * xpMult(g, sp, env));
  g.state.stats.sold++;
  if (fish.g >= 1) g.progress('sell', 1);
  g.progress('earn', value);
  g.emit('sold', { fish, value });
  g.emit('fishRemoved', { tankId: tank.id, fishId, reason: 'sold' });
  return ok(value);
}

export function sellAllAdults(g: Game): Result<{ count: number; total: number }> {
  const adults = g.tank.fish.filter((f) => f.g >= 1 && !f.fav);
  let total = 0;
  for (const f of adults) {
    const r = sellFish(g, f.id);
    if (r.ok) total += r.value ?? 0;
  }
  return ok({ count: adults.length, total });
}

export function moveFish(g: Game, fishId: string, toTankId: string): Result {
  const found = findFish(g.state, fishId);
  const to = tankById(g.state, toTankId);
  if (!found || !to || found.tank.id === to.id) return fail('invalid');
  const sp = getSpecies(found.fish.sp);
  if (sp.water !== to.type) return fail('water');
  if ((sp.minTier ?? 0) > to.tier) return fail('tier');
  if (capacityFree(to) < sp.bioload) return fail('capacity');
  found.tank.fish = found.tank.fish.filter((f) => f.id !== fishId);
  found.tank.clutches = found.tank.clutches.filter((c) => !(c.stage === 'court' && c.parents.includes(fishId)));
  to.fish.push(found.fish);
  g.emit('fishRemoved', { tankId: found.tank.id, fishId, reason: 'move' });
  g.emit('fishAdded', { tankId: to.id, fish: found.fish, source: 'move' });
  return ok();
}

export function renameFish(g: Game, fishId: string, name: string): Result {
  const found = findFish(g.state, fishId);
  const clean = name.trim().slice(0, 16);
  if (!found || !clean) return fail('invalid');
  found.fish.name = clean;
  return ok();
}

export function toggleFavorite(g: Game, fishId: string): Result {
  const found = findFish(g.state, fishId);
  if (!found) return fail('invalid');
  found.fish.fav = !found.fish.fav;
  return ok();
}

function growBy(g: Game, tank: TankState, fish: FishState, amount: number) {
  const sp = getSpecies(fish.sp);
  const before = fish.g;
  fish.g = Math.min(1, fish.g + amount);
  if (before < 1 && fish.g >= 1) {
    fish.adultAt = Date.now();
    g.addXp(sp.adultXp * xpMult(g, sp, computeEnv(tank)), fish.id);
    g.state.stats.grown++;
    g.progress('grow', 1);
    g.emit('fishAdult', { tankId: tank.id, fish });
  }
}

export function useElixir(g: Game, fishId: string): Result {
  const found = findFish(g.state, fishId);
  if (!found) return fail('invalid');
  if (found.fish.g >= 1) return fail('max');
  if ((g.state.inv.items.elixir ?? 0) > 0) g.state.inv.items.elixir--;
  else {
    const err = payFor(g, 0, getItem('elixir').pearls ?? 5);
    if (err) return fail(err);
  }
  growBy(g, found.tank, found.fish, BAL.ELIXIR_GROWTH);
  return ok();
}

export function growInstantCost(g: Game, fishId: string): number {
  const found = findFish(g.state, fishId);
  if (!found) return 0;
  const sp = getSpecies(found.fish.sp);
  return growPearlCost((1 - found.fish.g) * sp.growTime);
}

export function growInstant(g: Game, fishId: string): Result {
  const found = findFish(g.state, fishId);
  if (!found) return fail('invalid');
  if (found.fish.g >= 1) return fail('max');
  const err = payFor(g, 0, growInstantCost(g, fishId));
  if (err) return fail(err);
  growBy(g, found.tank, found.fish, 1);
  return ok();
}

/** Ödüllü reklam sonrası büyüme bonusu */
export function adGrowthBoost(g: Game, fishId: string): Result {
  const found = findFish(g.state, fishId);
  if (!found || found.fish.g >= 1) return fail('invalid');
  growBy(g, found.tank, found.fish, 0.25);
  return ok();
}

export function medicate(g: Game, tank: TankState = g.tank): Result<number> {
  const sick = tank.fish.filter((f) => f.sick);
  if (!sick.length) return fail('invalid');
  if ((g.state.inv.items.medicine ?? 0) > 0) g.state.inv.items.medicine--;
  else {
    const err = payFor(g, getItem('medicine').price ?? 120, 0);
    if (err) return fail(err);
  }
  for (const f of tank.fish) {
    if (f.sick) {
      f.sick = 0;
      f.hp = Math.min(100, f.hp + 15);
    }
  }
  return ok(sick.length);
}

// ------------------------------------------------------------------ besleme

/** Bir tutam yem kullanır; başarılıysa yem kimliğini döndürür */
export function dropFood(g: Game): Result<string> {
  const s = g.state;
  const id = s.selectedFood;
  if (!(s.inv.food[id] > 0)) {
    const other = Object.keys(s.inv.food).find((k) => s.inv.food[k] > 0 && k !== 'golden');
    if (!other) return fail('noFood');
    s.selectedFood = other;
    return dropFood(g);
  }
  s.inv.food[id]--;
  s.stats.fed++;
  g.progress('feed', 1);
  return ok(id);
}

/** Bir balık yem partikülünü yediğinde çağrılır; kazanılan GP'yi döndürür */
export function eatParticle(g: Game, tank: TankState, fishId: string, foodId: string): number {
  const fish = tank.fish.find((f) => f.id === fishId);
  if (!fish) return 0;
  const sp = getSpecies(fish.sp);
  const food = getFood(foodId);
  fish.food = Math.min(100, fish.food + food.nutrition * food.diet[sp.diet]);
  if (food.boost > 0) {
    fish.boost = Math.max(fish.boost ?? 0, food.boostTime);
    fish.boostAmt = Math.max(fish.boostAmt ?? 0, food.boost);
  }
  const env = computeEnv(tank);
  const xp = sp.xp * food.xpMult * xpMult(g, sp, env);
  g.addXp(xp, fishId);
  return xp;
}

export function selectFood(g: Game, foodId: string): Result {
  getFood(foodId);
  g.state.selectedFood = foodId;
  return ok();
}

export function buyFood(g: Game, foodId: string, packs = 1): Result {
  const f = getFood(foodId);
  if (f.level > g.state.player.level) return fail('level');
  const err = payFor(g, f.price * packs, (f.pearls ?? 0) * packs);
  if (err) return fail(err);
  g.state.inv.food[foodId] = (g.state.inv.food[foodId] ?? 0) + f.pack * packs;
  return ok();
}

export function buyItem(g: Game, itemId: 'medicine' | 'elixir' | 'mysteryEgg', n = 1): Result {
  const it = getItem(itemId);
  if (it.level > g.state.player.level) return fail('level');
  const err = payFor(g, (it.price ?? 0) * n, (it.pearls ?? 0) * n);
  if (err) return fail(err);
  g.state.inv.items[itemId] = (g.state.inv.items[itemId] ?? 0) + n;
  return ok();
}

// ------------------------------------------------------------------ dekor & bitki

export function buyDecor(g: Game, defId: string): Result {
  const d = getDecor(defId);
  if (d.exclusive) return fail('exclusive');
  if (d.level > g.state.player.level) return fail('level');
  if (d.water !== 'both' && d.water !== g.tank.type) return fail('water');
  const err = payFor(g, d.pearls ? 0 : d.price, d.pearls ?? 0);
  if (err) return fail(err);
  g.state.inv.decor[defId] = (g.state.inv.decor[defId] ?? 0) + 1;
  g.progress('buyDecor', 1);
  return ok();
}

export function buyPlant(g: Game, defId: string): Result {
  const p = getPlant(defId);
  if (p.level > g.state.player.level) return fail('level');
  if (p.water !== g.tank.type) return fail('water');
  const err = payFor(g, p.pearls ? 0 : p.price, p.pearls ?? 0);
  if (err) return fail(err);
  g.state.inv.plants[defId] = (g.state.inv.plants[defId] ?? 0) + 1;
  g.progress('buyDecor', 1);
  return ok();
}

export function placeDecor(g: Game, defId: string, x: number, z: number): Result<string> {
  const inv = g.state.inv.decor;
  if (!(inv[defId] > 0)) return fail('noItem');
  const def = getDecor(defId);
  if (def.water !== 'both' && def.water !== g.tank.type) return fail('water');
  inv[defId]--;
  const id = uid(g.state, 'd');
  g.tank.decor.push({ id, def: defId, x, z: clamp(z, 0, 1) });
  g.state.stats.decorPlaced++;
  g.emit('decorChanged', { tankId: g.tank.id });
  return ok(id);
}

export function placePlant(g: Game, defId: string, x: number, z: number): Result<string> {
  const inv = g.state.inv.plants;
  if (!(inv[defId] > 0)) return fail('noItem');
  const def = getPlant(defId);
  if (def.water !== g.tank.type) return fail('water');
  inv[defId]--;
  const id = uid(g.state, 'p');
  g.tank.plants.push({ id, def: defId, x, z: clamp(z, 0, 1), g: 0.15 });
  g.state.stats.decorPlaced++;
  g.emit('decorChanged', { tankId: g.tank.id });
  return ok(id);
}

export function moveItem(g: Game, id: string, x: number, z: number): Result {
  const t = g.tank;
  const w = getTier(t.type, t.tier).w;
  const item = t.decor.find((d) => d.id === id) ?? t.plants.find((p) => p.id === id);
  if (!item) return fail('invalid');
  item.x = clamp(x, 0, w);
  item.z = clamp(z, 0, 1);
  g.emit('decorChanged', { tankId: t.id });
  return ok();
}

export function flipItem(g: Game, id: string): Result {
  const t = g.tank;
  const item = t.decor.find((d) => d.id === id) ?? t.plants.find((p) => p.id === id);
  if (!item) return fail('invalid');
  item.flip = !item.flip;
  g.emit('decorChanged', { tankId: t.id });
  return ok();
}

/** Dekoru/bitkiyi envantere geri koyar */
export function storeItem(g: Game, id: string): Result {
  const t = g.tank;
  const d = t.decor.find((x) => x.id === id);
  if (d) {
    t.decor = t.decor.filter((x) => x.id !== id);
    g.state.inv.decor[d.def] = (g.state.inv.decor[d.def] ?? 0) + 1;
    delete g.state.flags[`pearlReady:${d.id}`];
    g.emit('decorChanged', { tankId: t.id });
    return ok();
  }
  const p = t.plants.find((x) => x.id === id);
  if (p) {
    // Bitki sökülünce büyümesi kaybolur, envantere fide olarak döner
    t.plants = t.plants.filter((x) => x.id !== id);
    g.state.inv.plants[p.def] = (g.state.inv.plants[p.def] ?? 0) + 1;
    g.emit('decorChanged', { tankId: t.id });
    return ok();
  }
  return fail('invalid');
}

export function sellInventoryDecor(g: Game, defId: string): Result<number> {
  if (!(g.state.inv.decor[defId] > 0)) return fail('noItem');
  const d = getDecor(defId);
  if (d.pearls || d.exclusive) return fail('exclusive');
  const value = Math.floor(d.price * 0.5);
  g.state.inv.decor[defId]--;
  g.addCoins(value);
  return ok(value);
}

export function trimPlant(g: Game, plantId: string): Result<number> {
  const p = g.tank.plants.find((x) => x.id === plantId);
  if (!p) return fail('invalid');
  if (p.g < 1) return fail('notReady');
  const def = getPlant(p.def);
  const value = Math.round(def.trim * (1 + g.state.player.level * 0.02));
  p.g = 0.55;
  g.addCoins(value, true);
  g.addXp(Math.max(2, def.trim / 20));
  g.state.stats.trimmed++;
  g.progress('trim', 1);
  g.emit('decorChanged', { tankId: g.tank.id });
  return ok(value);
}

export function collectClamPearl(g: Game, decorId: string): Result {
  const key = `pearlReady:${decorId}`;
  if (!g.state.flags[key]) return fail('notReady');
  const d = g.tank.decor.find((x) => x.id === decorId);
  if (!d) return fail('invalid');
  delete g.state.flags[key];
  d.gen = 0;
  g.addPearls(1);
  return ok();
}

// ------------------------------------------------------------------ bakım

export function wipeAlgae(g: Game, tank: TankState, index: number, amount: number): number {
  const before = tank.algae[index] ?? 0;
  const after = Math.max(0, before - amount);
  tank.algae[index] = after;
  const removed = before - after;
  if (removed > 0) {
    g.state.stats.wiped += removed;
    g.progress('wipe', removed);
  }
  return removed;
}

export function vacuumDirt(g: Game, tank: TankState, amount: number) {
  const removed = Math.min(tank.dirt, amount);
  tank.dirt -= removed;
  g.state.stats.vacuumed += 1;
  g.progress('vacuum', 1);
  return removed;
}

export function waterChange(g: Game, tank: TankState = g.tank): Result {
  const err = payFor(g, waterChangeCost(tank), 0);
  if (err) return fail(err);
  tank.pollution *= 1 - BAL.WATER_CHANGE_FRACTION;
  tank.dirt *= 0.85;
  g.state.stats.waterChanges++;
  g.progress('waterChange', 1);
  g.addXp(3 + g.state.player.level);
  g.emit('waterChanged', { tankId: tank.id });
  return ok();
}

/** Anında tam temizlik (ödüllü reklam veya altın) */
export function quickClean(g: Game, tank: TankState = g.tank, viaAd = false): Result {
  if (!viaAd) {
    const err = payFor(g, quickCleanCost(tank), 0);
    if (err) return fail(err);
  }
  for (let i = 0; i < tank.algae.length; i++) tank.algae[i] *= 0.05;
  tank.dirt = 0;
  tank.pollution *= 0.4;
  g.emit('waterChanged', { tankId: tank.id });
  return ok();
}

export function toggleLight(g: Game, tank: TankState = g.tank): Result {
  tank.light = !tank.light;
  return ok();
}

export function setTargetTemp(tank: TankState, temp: number): Result {
  const env = computeEnv(tank);
  tank.targetTemp = clamp(Math.round(temp * 2) / 2, Math.min(env.minTemp, BAL.ROOM_TEMP), Math.max(env.maxTemp, BAL.ROOM_TEMP));
  return ok();
}

export function buyEquipment(g: Game, slot: EquipSlot, tier: number, tank: TankState = g.tank): Result {
  const eq = getEquip(slot, tier);
  if (!eq) return fail('invalid');
  if ((tank.equip[slot] ?? 0) >= tier) return fail('max');
  if (eq.level > g.state.player.level) return fail('level');
  const err = payFor(g, eq.price, eq.pearls ?? 0);
  if (err) return fail(err);
  tank.equip[slot] = tier;
  if (slot === 'heater' && tank.type === 'fresh' && tank.targetTemp <= BAL.ROOM_TEMP) tank.targetTemp = 24;
  g.emit('tankChanged', { tankId: tank.id });
  return ok();
}

export function upgradeTank(g: Game, tank: TankState = g.tank): Result {
  const type = getTankType(tank.type);
  const next = type.tiers[tank.tier + 1];
  if (!next) return fail('max');
  if (next.level > g.state.player.level) return fail('level');
  const err = payFor(g, next.price, 0);
  if (err) return fail(err);
  const oldW = getTier(tank.type, tank.tier).w;
  tank.tier++;
  const k = next.w / oldW;
  for (const d of tank.decor) d.x *= k;
  for (const p of tank.plants) p.x *= k;
  g.addXp(20 * next.tier * g.state.player.level);
  g.emit('tankChanged', { tankId: tank.id });
  g.emit('sceneChanged', { tankId: tank.id });
  return ok();
}

export function buyMarineTank(g: Game): Result {
  if (g.state.tanks.some((t) => t.type === 'marine')) return fail('max');
  const type = getTankType('marine');
  if (type.level > g.state.player.level) return fail('level');
  const err = payFor(g, type.price, 0);
  if (err) return fail(err);
  const tank = createTank(g.state, 'marine');
  g.state.tanks.push(tank);
  g.state.active = g.state.tanks.length - 1;
  g.emit('sceneChanged', { tankId: tank.id });
  return ok();
}

export function switchTank(g: Game, index: number): Result {
  if (index < 0 || index >= g.state.tanks.length) return fail('invalid');
  g.state.active = index;
  g.emit('sceneChanged', { tankId: g.tank.id });
  return ok();
}

export function buyCosmetic(g: Game, id: string): Result {
  const c = getCosmetic(id);
  if (!c) return fail('invalid');
  if (g.state.owned[id]) return fail('max');
  if (c.level > g.state.player.level) return fail('level');
  const err = payFor(g, c.price ?? 0, c.pearls ?? 0);
  if (err) return fail(err);
  g.state.owned[id] = true;
  return ok();
}

export function applyCosmetic(g: Game, id: string, tank: TankState = g.tank): Result {
  const c = getCosmetic(id);
  if (!c || !g.state.owned[id]) return fail('invalid');
  if (c.water !== 'both' && c.water !== tank.type) return fail('water');
  if (c.kind === 'background') tank.background = id;
  else tank.substrate = id;
  g.emit('sceneChanged', { tankId: tank.id });
  return ok();
}

// ------------------------------------------------------------------ gelir

export function collectTips(g: Game, tank: TankState = g.tank, double = false): Result<number> {
  const amount = Math.floor(tank.tips);
  if (amount < 1) return fail('notReady');
  tank.tips -= amount;
  const total = amount * (double ? 2 : 1);
  g.addCoins(total, true);
  g.state.stats.tipsCollected++;
  g.progress('collect', 1);
  return ok(total);
}

export function collectLucky(g: Game, coins: number, pearls: number): Result {
  if (coins) g.addCoins(coins, true);
  if (pearls) g.addPearls(pearls);
  g.state.stats.lucky++;
  g.progress('lucky', 1);
  return ok();
}

export function exchangePearls(g: Game, pearls: number): Result<number> {
  if (pearls <= 0) return fail('invalid');
  const err = payFor(g, 0, pearls);
  if (err) return fail(err);
  const coins = Math.round(pearls * pearlCoinRate(g.state.player.level));
  g.addCoins(coins);
  return ok(coins);
}

// ------------------------------------------------------------------ üreme

export function breed(g: Game, spId: string): Result {
  return startBreeding(g, g.tank, spId) ? ok() : fail('notReady');
}

export function clutchSpeedCost(g: Game, clutchId: string): number {
  const c = g.tank.clutches.find((x) => x.id === clutchId);
  return c ? breedPearlCost(c.t) : 0;
}

export function speedUpClutch(g: Game, clutchId: string, how: 'ad' | 'pearls'): Result {
  const c = g.tank.clutches.find((x) => x.id === clutchId);
  if (!c) return fail('invalid');
  if (how === 'pearls') {
    const err = payFor(g, 0, breedPearlCost(c.t));
    if (err) return fail(err);
    c.t = 0;
  } else {
    c.t *= 0.5;
    c.speedups = (c.speedups ?? 0) + 1;
  }
  return ok();
}

// ------------------------------------------------------------------ sürpriz yumurta

export function rollEggSpecies(g: Game, tank: TankState = g.tank): SpeciesDef {
  const lvl = g.state.player.level;
  const free = capacityFree(tank);
  const rarities = Object.keys(EGG_ODDS) as Rarity[];
  for (let attempt = 0; attempt < 12; attempt++) {
    const rarity = weightedPick(rarities, (r) => EGG_ODDS[r]);
    // yalnızca bu tanka sığabilecek türler
    const pool = SPECIES.filter(
      (sp) =>
        sp.rarity === rarity && sp.water === tank.type && !sp.exclusive && !sp.pearls && sp.level <= lvl + 5 &&
        (sp.minTier ?? 0) <= tank.tier && sp.bioload <= free,
    );
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  }
  return getSpecies(tank.type === 'fresh' ? 'zebra' : 'clown');
}

export function openMysteryEgg(g: Game): Result<FishState> {
  if (!(g.state.inv.items.mysteryEgg > 0)) return fail('noItem');
  const tank = g.tank;
  const sp = rollEggSpecies(g, tank);
  if (capacityFree(tank) < sp.bioload || (sp.minTier ?? 0) > tank.tier) return fail('capacity');
  g.state.inv.items.mysteryEgg--;
  const fish = createFish(g.state, sp.id, g.lang(), { g: 0.08, sex: Math.random() < 0.5 ? 'M' : 'F' });
  tank.fish.push(fish);
  if (!g.state.discovered[sp.id]) g.state.discovered[sp.id] = Date.now();
  g.state.stats.eggsOpened++;
  g.emit('fishAdded', { tankId: tank.id, fish, source: 'egg' });
  return ok(fish);
}

// ------------------------------------------------------------------ yardımcı sorgular

export function isLuckySpecies(sp: SpeciesDef) {
  return hasTrait(sp, 'lucky');
}

export function speciesAura(sp: SpeciesDef) {
  return trait(sp, 'xpAura');
}
