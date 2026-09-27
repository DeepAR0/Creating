import type { Scene } from './scene';
import type { Game } from '../game/game';
import { getDecor } from '../data/decor';
import { getPlant } from '../data/plants';
import { depthScale, groundY } from './layout';
import { plantBounds } from './draw/plants';
import * as A from '../game/actions';
import { clamp } from '../game/util';

export interface InputHandlers {
  onSelectFish(id: string | null): void;
  onSelectDecor(id: string | null): void;
  onResult(r: A.Result<unknown>, kind: 'trim' | 'pearl' | 'food'): void;
  onTap(): void;
  onFx(kind: 'plop' | 'wipe' | 'lucky'): void;
}

/** Dokunmatik/işaretçi girdileri: seçim, besleme, silme, sifon, dekor taşıma, kaydırma */
export function attachInput(canvas: HTMLCanvasElement, scene: Scene, game: Game, h: InputHandlers) {
  let down: { x: number; y: number; t: number; id: number } | null = null;
  let moved = false;
  let dragItem: { id: string; dx: number } | null = null;
  let lastX = 0;
  let lastY = 0;
  let feedCd = 0;

  const world = () => scene.world;
  const toWorld = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    return { sx, sy, x: scene.cam.wx(sx), y: scene.cam.wy(sy) };
  };

  const itemAt = (x: number, y: number): string | null => {
    const g = world().geom;
    const t = game.tank;
    let best: string | null = null;
    let bestZ = -1;
    for (const d of t.decor) {
      const def = getDecor(d.def);
      const k = depthScale(d.z);
      const by = groundY(g, d.z);
      if (Math.abs(x - d.x) < (def.w * k) / 2 + 1 && y < by + 1 && y > by - def.h * k - 1 && d.z > bestZ) {
        best = d.id;
        bestZ = d.z;
      }
    }
    for (const p of t.plants) {
      const def = getPlant(p.def);
      const b = plantBounds(def, p.g);
      const by = def.type === 'floating' ? g.surfaceY + 3 : groundY(g, p.z);
      if (Math.abs(x - p.x) < b.w / 2 + 1 && y < by + 1 && y > by - b.h - 1 && p.z + 0.001 > bestZ) {
        best = p.id;
        bestZ = p.z;
      }
    }
    return best;
  };

  const stroke = (x: number, y: number) => {
    const g = world().geom;
    if (scene.tool === 'sponge') {
      const r = Math.max(2.2, g.H * 0.09);
      if (world().wipe(x, y, r, 0.22) > 0) h.onFx('wipe');
    } else if (scene.tool === 'vacuum') {
      if (y > g.subBackY - 4) world().vacuum(x, clamp(y, g.subBackY, g.H), Math.max(2.2, g.H * 0.08));
    }
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = toWorld(e);
    down = { x: p.sx, y: p.sy, t: performance.now(), id: e.pointerId };
    moved = false;
    lastX = p.sx;
    lastY = p.sy;
    scene.cursor = { x: p.x, y: p.y, active: scene.tool === 'sponge' || scene.tool === 'vacuum' };
    h.onTap();
    if (scene.tool === 'decor') {
      const id = itemAt(p.x, p.y);
      if (id) {
        const item = game.tank.decor.find((d) => d.id === id) ?? game.tank.plants.find((q) => q.id === id)!;
        dragItem = { id, dx: item.x - p.x };
        h.onSelectDecor(id);
      }
    }
    if (scene.tool === 'sponge' || scene.tool === 'vacuum') stroke(p.x, p.y);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const p = toWorld(e);
    if (Math.hypot(p.sx - down.x, p.sy - down.y) > 8) moved = true;
    scene.cursor = { x: p.x, y: p.y, active: scene.tool === 'sponge' || scene.tool === 'vacuum' };
    if (scene.tool === 'sponge' || scene.tool === 'vacuum') {
      // hızlı hareketlerde ara noktaları da işle
      const steps = Math.ceil(Math.hypot(p.sx - lastX, p.sy - lastY) / 14);
      for (let i = 1; i <= steps; i++) {
        const sx = lastX + ((p.sx - lastX) * i) / steps;
        const sy = lastY + ((p.sy - lastY) * i) / steps;
        stroke(scene.cam.wx(sx), scene.cam.wy(sy));
      }
    } else if (scene.tool === 'decor' && dragItem) {
      const g = world().geom;
      const z = clamp((p.y - (g.subBackY + g.H * 0.02)) / (g.subFrontY - g.subBackY), 0, 1);
      A.moveItem(game, dragItem.id, clamp(p.x + dragItem.dx, 1, g.W - 1), z);
    } else if (moved && scene.cam.canPan) {
      scene.cam.panBy(p.sx - lastX);
    }
    lastX = p.sx;
    lastY = p.sy;
  });

  const end = (e: PointerEvent) => {
    if (!down || e.pointerId !== down.id) return;
    const p = toWorld(e);
    const tap = !moved && performance.now() - down.t < 450;
    down = null;
    dragItem = null;
    scene.cursor.active = false;
    if (!tap) return;
    const w = world();
    const px = scene.cam.scale;
    // Şans baloncuğu her araçta toplanabilir
    const l = w.luckyAt(p.x, p.y, px);
    if (l) {
      w.collectLucky(l);
      h.onFx('lucky');
      return;
    }
    const g = w.geom;
    if (scene.tool === 'feed') {
      if (p.x < 0 || p.x > g.W || p.y > g.H) return;
      const now = performance.now();
      if (now - feedCd < 120) return;
      feedCd = now;
      if (w.dropFoodAt(clamp(p.x, 1, g.W - 1))) h.onFx('plop');
      else h.onResult({ ok: false, err: 'noFood' }, 'food');
      return;
    }
    if (scene.tool === 'decor') {
      if (!itemAt(p.x, p.y)) h.onSelectDecor(null);
      return;
    }
    if (scene.tool !== 'hand') return;
    // İstiridye incisi
    for (const d of game.tank.decor) {
      if (!game.state.flags[`pearlReady:${d.id}`]) continue;
      const def = getDecor(d.def);
      if (Math.abs(p.x - d.x) < def.w / 2 && Math.abs(p.y - (groundY(g, d.z) - def.h * 0.4)) < def.h) {
        h.onResult(A.collectClamPearl(game, d.id), 'pearl');
        return;
      }
    }
    const a = w.fishAt(p.x, p.y, px);
    if (a) {
      w.poke(a);
      h.onSelectFish(a.id);
      return;
    }
    // Olgun bitkiyi buda
    const id = itemAt(p.x, p.y);
    const plant = id ? game.tank.plants.find((q) => q.id === id) : null;
    if (plant && plant.g >= 1) {
      h.onResult(A.trimPlant(game, plant.id), 'trim');
      return;
    }
    h.onSelectFish(null);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}
