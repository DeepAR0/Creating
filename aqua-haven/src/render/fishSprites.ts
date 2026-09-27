import type { CreatureLook, FishLook, FishState, Sex, SpeciesDef } from '../game/types';
import { drawBody, fishAssets, type FishAssets } from './draw/fish';
import { hashString } from '../game/util';

export function stageOf(g: number): number {
  return g < 0.4 ? 0 : g < 1 ? 1 : 2;
}

/** Tür + cinsiyet + varyant birleşik balık görünümü */
export function fishLook(sp: SpeciesDef, sex: Sex, variant?: string, stage = 2): FishLook {
  let look = { ...(sp.look as FishLook) };
  if (sex === 'F' && sp.lookF && stage >= 1) look = { ...look, ...sp.lookF };
  if (variant) {
    const v = sp.variants?.find((x) => x.id === variant);
    if (v) look = { ...look, ...(v.look as Partial<FishLook>) };
  }
  if (stage === 0) look = { ...look, h: look.h * 1.08, tailSize: look.tailSize * 0.85 };
  return look;
}

export function creatureLook(sp: SpeciesDef, variant?: string): CreatureLook {
  let look = { ...(sp.look as CreatureLook) };
  if (variant) {
    const v = sp.variants?.find((x) => x.id === variant);
    if (v) look = { ...look, ...(v.look as Partial<CreatureLook>) };
  }
  return look;
}

export function lookKey(sp: SpeciesDef, sex: Sex, variant: string | undefined, stage: number) {
  const f = sex === 'F' && sp.lookF && stage >= 1 ? 'F' : 'M';
  return `${sp.id}|${f}|${variant ?? ''}|${stage}`;
}

interface SpriteEntry {
  canvas: HTMLCanvasElement;
  px: number;
  key: string;
  box: FishAssets['box'];
  used: number;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** Balık gövdelerini piksel ölçeğinde bir kez çizip saklar (performans) */
export class FishSpriteCache {
  private map = new Map<string, SpriteEntry>();
  private frame = 0;

  /** pxPerUnit: 1 birim (balık boyu) kaç cihaz pikseli */
  get(
    mainCtx: CanvasRenderingContext2D,
    fish: FishState,
    sp: SpeciesDef,
    pxPerUnit: number,
  ): { assets: FishAssets; entry: SpriteEntry; stage: number } {
    const stage = stageOf(fish.g);
    const key = lookKey(sp, fish.sex, fish.var, stage);
    const look = fishLook(sp, fish.sex, fish.var, stage);
    const assets = fishAssets(mainCtx, key, look);
    const sick = fish.sick ? 1 : 0;
    const id = `${fish.id}|${key}|${sick}`;
    let e = this.map.get(fish.id);
    const needs = !e || e.key !== id || pxPerUnit > e.px * 1.15 || pxPerUnit < e.px * 0.7;
    if (needs) {
      const px = Math.min(700, Math.max(16, pxPerUnit));
      const spriteAssets = assets;
      const pad = look.glow ? 0.14 : 0.03;
      const box = { x: spriteAssets.box.x - pad, y: spriteAssets.box.y - pad, w: spriteAssets.box.w + pad * 2, h: spriteAssets.box.h + pad * 2 };
      const canvas = e?.canvas ?? makeCanvas(1, 1);
      canvas.width = Math.ceil(box.w * px);
      canvas.height = Math.ceil(box.h * px);
      const c = canvas.getContext('2d')!;
      c.setTransform(px, 0, 0, px, -box.x * px, -box.y * px);
      c.clearRect(box.x, box.y, box.w, box.h);
      const local = fishAssets(c, key, look);
      drawBody(c, local, hashString(fish.id), stage, !!fish.sick, px);
      e = { canvas, px, key: id, box, used: this.frame };
      this.map.set(fish.id, e);
    }
    e!.used = this.frame;
    return { assets, entry: e!, stage };
  }

  /** Kullanılmayan sprite'ları temizle */
  tick() {
    this.frame++;
    if (this.frame % 300 !== 0) return;
    for (const [k, v] of this.map) if (this.frame - v.used > 600) this.map.delete(k);
  }

  clear() {
    this.map.clear();
  }
}
