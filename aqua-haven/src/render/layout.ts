import { getTier } from '../data/tanks';
import type { TankState } from '../game/types';
import { lerp } from '../game/util';

/** Tankın dünya birimlerindeki geometrisi (y aşağı doğru artar) */
export interface TankGeom {
  W: number;
  H: number;
  tier: number;
  surfaceY: number; // su yüzeyi
  subBackY: number; // zeminin arka üst kenarı
  subFrontY: number; // zeminin ön kenarı
  viewF: number; // görünür yükseklik çarpanı (oda payı)
}

const VIEW_F = [1.55, 1.45, 1.36, 1.26, 1.19, 1.15];

export function tankGeom(t: TankState): TankGeom {
  const tier = getTier(t.type, t.tier);
  const W = tier.w;
  const H = tier.h;
  const tierIdx = t.type === 'fresh' ? t.tier : Math.min(5, t.tier + 2);
  return {
    W,
    H,
    tier: tierIdx,
    surfaceY: H * 0.075,
    subBackY: H - H * 0.19,
    subFrontY: H - H * 0.03,
    viewF: VIEW_F[Math.min(VIEW_F.length - 1, tierIdx)],
  };
}

/** Derinlikteki (z: 0 arka, 1 ön) bir nesnenin taban y'si */
export function groundY(g: TankGeom, z: number): number {
  return lerp(g.subBackY + g.H * 0.025, g.subFrontY - g.H * 0.01, z);
}

export function depthScale(z: number): number {
  return 0.8 + 0.2 * z;
}

/** Yüzme alanı sınırları */
export function swimBounds(g: TankGeom, size: number, z: number) {
  const m = Math.max(1, size * 0.5);
  return {
    x0: m,
    x1: g.W - m,
    y0: g.surfaceY + size * 0.3 + 0.6,
    y1: groundY(g, z) - size * 0.28 - 0.4,
  };
}
