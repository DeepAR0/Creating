import { getSpecies } from '../../data/species';
import { getPlant } from '../../data/plants';
import { getDecor } from '../../data/decor';
import { createFish } from '../state';
import type { Clutch, FishState, GameState, SpeciesDef, TankState } from '../types';
import { computeEnv, type TankEnv } from './env';
import type { SimHost } from './host';
import { chance, randInt, uid, weightedPick } from '../util';

export type BreedCheckKey = 'pair' | 'happy' | 'quality' | 'temp' | 'site' | 'space' | 'cooldown' | 'busy';

export interface BreedCheck {
  ok: boolean;
  items: { k: BreedCheckKey; ok: boolean }[];
  male?: FishState;
  female?: FishState;
}

export function breederSpeciesIn(t: TankState): SpeciesDef[] {
  const ids = new Set(t.fish.map((f) => f.sp));
  return [...ids].map(getSpecies).filter((sp) => !!sp.breed);
}

/** En uygun çifti seçer: yetişkin, beklemede olmayan, en mutlu erkek ve dişi */
export function bestPair(t: TankState, sp: SpeciesDef): { male?: FishState; female?: FishState } {
  const busy = new Set(t.clutches.flatMap((c) => c.parents));
  const adults = t.fish.filter((f) => f.sp === sp.id && f.g >= 1 && !busy.has(f.id));
  const score = (f: FishState) => (f.cd ? -1000 : 0) + f.joy + f.hp * 0.2 - (f.sick ? 50 : 0);
  const males = adults.filter((f) => f.sex === 'M').sort((a, b) => score(b) - score(a));
  const females = adults.filter((f) => f.sex === 'F').sort((a, b) => score(b) - score(a));
  return { male: males[0], female: females[0] };
}

export function checkBreeding(t: TankState, sp: SpeciesDef, env?: TankEnv, ignoreBusy = false): BreedCheck {
  const b = sp.breed!;
  const e = env ?? computeEnv(t);
  const { male, female } = bestPair(t, sp);
  const q = 100 - t.pollution;
  const items: BreedCheck['items'] = [];
  const pair = !!male && !!female;
  items.push({ k: 'pair', ok: pair });
  items.push({ k: 'happy', ok: pair && male!.joy >= b.minHappy && female!.joy >= b.minHappy });
  items.push({ k: 'quality', ok: q >= b.minQ });
  items.push({ k: 'temp', ok: t.temp >= b.temp[0] - 0.05 && t.temp <= b.temp[1] + 0.05 });
  if (b.needs.length) items.push({ k: 'site', ok: b.needs.some((s) => e.sites.has(s)) });
  items.push({ k: 'space', ok: e.cap - e.used >= sp.bioload });
  items.push({ k: 'cooldown', ok: pair && !(male!.cd ?? 0) && !(female!.cd ?? 0) });
  if (!ignoreBusy) items.push({ k: 'busy', ok: !t.clutches.some((c) => c.sp === sp.id) });
  return { ok: items.every((i) => i.ok), items, male, female };
}

function findSite(t: TankState, sp: SpeciesDef): string | undefined {
  const needs = sp.breed?.needs ?? [];
  if (!needs.length) return undefined;
  for (const d of t.decor) if (getDecor(d.def).sites?.some((s) => needs.includes(s))) return d.id;
  for (const p of t.plants) if (getPlant(p.def).sites.some((s) => needs.includes(s)) && p.g > 0.25) return p.id;
  return undefined;
}

export function startBreeding(host: SimHost, t: TankState, spId: string): boolean {
  const sp = getSpecies(spId);
  if (!sp.breed) return false;
  const check = checkBreeding(t, sp);
  if (!check.ok || !check.male || !check.female) return false;
  const c: Clutch = {
    id: uid(host.state, 'c'),
    sp: spId,
    stage: 'court',
    t: sp.breed.time,
    total: sp.breed.time,
    parents: [check.male.id, check.female.id],
    site: findSite(t, sp),
    speedups: 0,
  };
  t.clutches.push(c);
  host.emit('clutchStarted', { tankId: t.id, sp: spId });
  host.progress('breed', 1);
  return true;
}

function rollVariant(sp: SpeciesDef, parents: FishState[]): { v?: string; mutated: boolean } {
  const vars = sp.variants ?? [];
  if (!vars.length) return { mutated: false };
  const parentVars = parents.map((p) => p.var).filter(Boolean) as string[];
  if (parentVars.length && chance(0.4)) return { v: parentVars[randInt(0, parentVars.length - 1)], mutated: false };
  if (chance(sp.breed?.mutation ?? 0)) return { v: weightedPick(vars, (x) => x.w).id, mutated: true };
  return { mutated: false };
}

function spawnOffspring(host: SimHost, t: TankState, env: TankEnv, c: Clutch): boolean {
  const sp = getSpecies(c.sp);
  const b = sp.breed!;
  const free = env.cap - env.used;
  const fit = Math.floor(free / sp.bioload);
  if (fit < 1) return false;
  const count = Math.min(fit, randInt(b.brood[0], b.brood[1]));
  const parents = c.parents.map((id) => t.fish.find((f) => f.id === id)).filter(Boolean) as FishState[];
  const mutations: string[] = [];
  for (let i = 0; i < count; i++) {
    const { v, mutated } = rollVariant(sp, parents);
    const baby = createFish(host.state, c.sp, host.lang(), { g: 0.02, variant: v, bred: true });
    baby.food = 80;
    t.fish.push(baby);
    env.used += sp.bioload;
    if (v) {
      const key = `${c.sp}:${v}`;
      if (!host.state.discovered[key]) host.state.discovered[key] = Date.now();
    }
    if (mutated && v) {
      mutations.push(v);
      host.state.stats.mutations++;
    }
    host.emit('fishAdded', { tankId: t.id, fish: baby, source: 'bred' });
  }
  for (const p of parents) p.cd = b.cooldown;
  host.state.stats.bred += count;
  host.addXp(sp.adultXp * 0.5 * count);
  host.emit('bred', { tankId: t.id, sp: c.sp, count, mutations });
  return true;
}

function conditionsHold(t: TankState, sp: SpeciesDef, env: TankEnv, c: Clutch): boolean {
  const b = sp.breed!;
  const q = 100 - t.pollution;
  if (c.stage === 'eggs') return q >= b.minQ - 10 && t.temp >= b.temp[0] - 1 && t.temp <= b.temp[1] + 1;
  const parents = c.parents.map((id) => t.fish.find((f) => f.id === id));
  if (parents.some((p) => !p)) return false;
  const okHappy = parents.every((p) => p!.joy >= b.minHappy - 10);
  const okSite = !b.needs.length || b.needs.some((s) => env.sites.has(s));
  return okHappy && okSite && q >= b.minQ - 5 && t.temp >= b.temp[0] - 0.5 && t.temp <= b.temp[1] + 0.5;
}

export function updateClutches(host: SimHost, t: TankState, env: TankEnv, dt: number) {
  for (let i = t.clutches.length - 1; i >= 0; i--) {
    const c = t.clutches[i];
    const sp = getSpecies(c.sp);
    if (!sp.breed) {
      t.clutches.splice(i, 1);
      continue;
    }
    // Ebeveynlerden biri artık yoksa kur aşaması iptal olur
    if (c.stage === 'court' && c.parents.some((id) => !t.fish.find((f) => f.id === id))) {
      t.clutches.splice(i, 1);
      continue;
    }
    const ok = conditionsHold(t, sp, env, c);
    c.paused = !ok;
    if (!ok) continue;
    c.t -= dt;
    if (c.t > 0) continue;
    if (c.stage === 'court' && sp.breed.hatch > 0) {
      c.stage = 'eggs';
      c.t = sp.breed.hatch;
      c.total = sp.breed.hatch;
      host.emit('clutchEggs', { tankId: t.id, sp: c.sp });
      continue;
    }
    if (spawnOffspring(host, t, env, c)) t.clutches.splice(i, 1);
    else {
      c.t = 0;
      c.paused = true;
    }
  }
}

export function clutchProgress(c: Clutch): number {
  return c.total > 0 ? 1 - c.t / c.total : 1;
}

export function speciesBreedingIn(s: GameState): number {
  return s.tanks.reduce((n, t) => n + t.clutches.length, 0);
}
