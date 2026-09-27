import { BAL } from '../balance';
import { getSpecies } from '../../data/species';
import type { FishState, GameState, TankState } from '../types';
import { computeEnv, type TankEnv } from './env';
import { trait } from './fish';
import { getTier } from '../../data/tanks';

export function variantMult(f: FishState): number {
  if (!f.var) return 1;
  const sp = getSpecies(f.sp);
  return sp.variants?.find((v) => v.id === f.var)?.mult ?? 1;
}

/** Bir canlının şu anki satış değeri */
export function sellValue(s: GameState, f: FishState): number {
  const sp = getSpecies(f.sp);
  const curve = BAL.SELL_CURVE_MIN + (1 - BAL.SELL_CURVE_MIN) * Math.pow(f.g, BAL.SELL_CURVE_POW);
  const condition = 0.75 + 0.25 * ((f.hp / 100) * 0.5 + (f.joy / 100) * 0.5);
  const golden = 1 + trait(sp, 'golden');
  const hot = s.daily.hot.includes(f.sp) ? BAL.HOT_MULT : 1;
  const bred = f.bred ? BAL.BRED_MULT : 1;
  const sick = f.sick ? 0.6 : 1;
  const base = sp.pearls ? sp.sell : sp.sell;
  return Math.max(1, Math.round(base * curve * condition * variantMult(f) * golden * hot * bred * sick));
}

/** Tankın ziyaretçi çekiciliği */
export function beautyScore(t: TankState, env?: TankEnv): number {
  const e = env ?? computeEnv(t);
  let fishBeauty = 0;
  const species = new Set<string>();
  for (const f of t.fish) {
    const sp = getSpecies(f.sp);
    species.add(f.sp);
    fishBeauty += sp.beauty * (0.3 + 0.7 * f.g) * (0.5 + f.joy / 200) * variantMult(f) ** 0.5;
  }
  const diversity = 1 + Math.min(0.5, species.size * 0.05);
  const clean = (1 - e.avgAlgae * 0.6) * (0.5 + (0.5 * (100 - t.pollution)) / 100) * (1 - (t.dirt / 100) * 0.3);
  return Math.max(0, (fishBeauty * diversity + e.decorBeauty) * clean);
}

export function tipRatePerMin(s: GameState, t: TankState, env?: TankEnv): number {
  const vip = s.iap.vipUntil > Date.now() ? BAL.VIP_TIP_MULT : 1;
  return beautyScore(t, env) * BAL.TIP_RATE * vip;
}

export function tipCapMinutes(s: GameState): number {
  const vip = s.iap.vipUntil > Date.now();
  return (vip ? BAL.VIP_TIP_CAP_MIN : BAL.TIP_CAP_MIN) + s.tipCapBonus * 60;
}

export function tipCap(s: GameState, t: TankState, env?: TankEnv): number {
  return Math.max(50, tipRatePerMin(s, t, env) * tipCapMinutes(s));
}

export function waterChangeCost(t: TankState): number {
  return Math.ceil(getTier(t.type, t.tier).liters * BAL.WATER_CHANGE_COST_PER_L);
}

export function quickCleanCost(t: TankState): number {
  return Math.ceil(getTier(t.type, t.tier).liters * BAL.QUICK_CLEAN_COST_PER_L);
}

/** Büyümeyi anında tamamlamanın inci bedeli (10 dk = 1 inci) */
export function growPearlCost(secondsLeft: number): number {
  return Math.max(1, Math.ceil(secondsLeft / 600));
}

export function breedPearlCost(secondsLeft: number): number {
  return Math.max(1, Math.ceil(secondsLeft / 600));
}

/** 1 incinin altın karşılığı (seviyeyle artar) */
export function pearlCoinRate(level: number): number {
  return BAL.PEARL_TO_COIN * (1 + (level - 1) * 0.5);
}
