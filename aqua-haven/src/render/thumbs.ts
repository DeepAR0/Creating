import { getSpecies } from '../data/species';
import { getPlant } from '../data/plants';
import { getDecor } from '../data/decor';
import type { FishLook, Sex } from '../game/types';
import { drawBody, drawFins, fishAssets } from './draw/fish';
import { drawCreature } from './draw/creatures';
import { drawPlant, plantShape } from './draw/plants';
import { drawDecorStatic } from './draw/decor';
import { creatureLook, fishLook, lookKey } from './fishSprites';

// Mağaza ve listeler için küçük resimler (data URL, önbellekli)
const cache = new Map<string, string>();

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function speciesThumb(id: string, sex: Sex = 'M', variant?: string, stage = 2, width = 128): string {
  const key = `sp:${id}:${sex}:${variant ?? ''}:${stage}:${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const sp = getSpecies(id);
  const W = width;
  const H = Math.round(width * 0.66);
  const c = canvas(W, H);
  const ctx = c.getContext('2d')!;
  if (sp.kind === 'fish') {
    const look: FishLook = fishLook(sp, sex, variant, stage);
    const a = fishAssets(ctx, 'thumb|' + lookKey(sp, sex, variant, stage), look);
    const span = a.box.w + look.tailSize * 0.3;
    const k = Math.min((W - 8) / span, (H - 6) / (a.box.h + 0.1));
    ctx.setTransform(k, 0, 0, k, W / 2 + (span / 2 - a.box.w - a.box.x) * k * 0.5 + 6 * (W / 128), H / 2);
    drawFins(ctx, a, 0.6, 'back', stage);
    drawBody(ctx, a, 7, stage, false, k);
    drawFins(ctx, a, 0.6, 'front', stage);
  } else {
    const k = (sp.kind === 'seahorse' ? 52 : sp.kind === 'jelly' ? 70 : 88) * (W / 128);
    ctx.setTransform(k, 0, 0, k, W / 2, H / 2 + (sp.kind === 'seahorse' ? -6 : 0));
    drawCreature(ctx, sp.kind, creatureLook(sp, variant), { phase: 0.5, moving: 0.3, pulse: 0.2 });
  }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function plantThumb(id: string, width = 96): string {
  const key = `pl:${id}:${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def = getPlant(id);
  const u = width / 96;
  const W = width;
  const H = Math.round(84 * u);
  const c = canvas(W, H);
  const ctx = c.getContext('2d')!;
  const k = Math.min((W - 8 * u) / (def.w * 1.3), (H - 6 * u) / (def.type === 'floating' ? 10 : def.h));
  ctx.setTransform(k, 0, 0, k, W / 2, def.type === 'floating' ? H * 0.2 : H - 3 * u);
  const shape = plantShape('thumb-' + id, def, 1, 0, '#1b7aa3');
  drawPlant(ctx, def, shape, 1, 0, 0, 1, 1, false, -1000);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function decorThumb(id: string, width = 110): string {
  const key = `dc:${id}:${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def = getDecor(id);
  const u = width / 110;
  const W = width;
  const H = Math.round(84 * u);
  const c = canvas(W, H);
  const ctx = c.getContext('2d')!;
  const k = Math.min((W - 10 * u) / (def.w * 1.25), (H - 8 * u) / (def.h * 1.25));
  ctx.setTransform(k, 0, 0, k, W / 2, H - 5 * u);
  drawDecorStatic(ctx, def, 'thumb' + id);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
