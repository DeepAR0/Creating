import type { Game } from '../game/game';
import type { CreatureLook, DecorState, PlantState } from '../game/types';
import { getDecor } from '../data/decor';
import { getPlant } from '../data/plants';
import { getFood } from '../data/foods';
import { BAL } from '../game/balance';
import { Camera } from './camera';
import { depthScale, groundY, type TankGeom } from './layout';
import { World, type Agent, type FoodParticle } from './world';
import { FishSpriteCache, creatureLook } from './fishSprites';
import { drawFins } from './draw/fish';
import { drawCreature } from './draw/creatures';
import { drawPlant, plantShape } from './draw/plants';
import { drawDecorDynamic, drawDecorStatic } from './draw/decor';
import {
  drawCaustics,
  drawEquipmentBack,
  drawLid,
  drawLightRays,
  drawRoom,
  drawSubstrate,
  drawSurface,
  drawTankFrameFront,
  drawWaterBackground,
  makeCausticTile,
  themeOf,
} from './draw/environment';
import { alpha } from './color';
import { clamp, hashString, mulberry32 } from '../game/util';

export type Tool = 'hand' | 'feed' | 'sponge' | 'vacuum' | 'decor';

interface Cache {
  canvas: HTMLCanvasElement;
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function makeCanvas() {
  return document.createElement('canvas');
}

/** Dünya dikdörtgenini (x,y,w,h) ölçekli bir önbellek tuvaline çizer */
function renderCache(
  prev: Cache | null,
  key: string,
  x: number,
  y: number,
  w: number,
  h: number,
  k: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Cache {
  if (prev && prev.key === key) return prev;
  const canvas = prev?.canvas ?? makeCanvas();
  const kk = Math.min(k, 4096 / w, 4096 / h);
  canvas.width = Math.max(1, Math.ceil(w * kk));
  canvas.height = Math.max(1, Math.ceil(h * kk));
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(kk, 0, 0, kk, -x * kk, -y * kk);
  ctx.clearRect(x, y, w, h);
  draw(ctx);
  return { canvas, key, x, y, w, h };
}

interface Drawable {
  z: number;
  kind: 0 | 1 | 2; // 0 dekor, 1 bitki, 2 ajan
  ref: DecorState | PlantState | Agent;
}

export class Scene {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cam = new Camera();
  world: World;
  game: Game;
  sprites = new FishSpriteCache();
  tool: Tool = 'hand';
  selectedId: string | null = null;
  decorSel: string | null = null;
  cursor = { x: 0, y: 0, active: false };
  safe = { left: 0, right: 0 };
  quality: 'high' | 'low' = 'high';
  private room: Cache | null = null;
  private bg: Cache | null = null;
  private sub: Cache | null = null;
  private front: Cache | null = null;
  private algae: HTMLCanvasElement = makeCanvas();
  private algaeSum = -1;
  private algaeT = 0;
  private decorSprites = new Map<string, Cache>();
  private caustic: HTMLCanvasElement | null = null;
  private blobs: HTMLCanvasElement[] = [];
  private dpr = 1;
  private drawables: Drawable[] = [];
  private sceneKey = '';

  constructor(canvas: HTMLCanvasElement, game: Game, world: World) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.game = game;
    this.world = world;
    game.events.on('sceneChanged', () => this.invalidate());
    game.events.on('tankChanged', () => this.invalidate());
  }

  invalidate() {
    this.room = null;
    this.bg = null;
    this.sub = null;
    this.front = null;
    this.decorSprites.clear();
    this.algaeSum = -1;
    this.sceneKey = '';
  }

  resize(w: number, h: number, dpr: number) {
    this.dpr = Math.min(dpr, this.quality === 'high' ? 2 : 1.5);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.fitCamera();
    this.invalidate();
  }

  fitCamera() {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    this.cam.fit(this.world.geom, w, h, this.dpr, this.safe.left, this.safe.right);
  }

  get k() {
    return this.cam.scale * this.dpr;
  }

  // ---------------------------------------------------------------- önbellekler

  private ensureCaches(g: TankGeom) {
    const t = this.world.tank;
    const key = `${t.id}|${t.tier}|${t.background}|${t.substrate}|${this.cam.vw}x${this.cam.vh}|${this.dpr}`;
    if (key !== this.sceneKey) {
      this.sceneKey = key;
      this.fitCamera();
      this.room = null;
      this.bg = null;
      this.sub = null;
      this.front = null;
      this.decorSprites.clear();
    }
    const cam = this.cam;
    const k = this.k;
    const vwU = cam.vw / cam.scale;
    const x0 = (cam.canPan ? cam.minCamX : cam.wx(0)) - 2;
    const x1 = (cam.canPan ? cam.maxCamX + vwU : cam.wx(cam.vw)) + 2;
    const y0 = cam.wy(0) - 2;
    const y1 = cam.wy(cam.vh) + 2;
    const hour = new Date().getHours();
    this.room = renderCache(this.room, `${key}|${hour >= 7 && hour < 19}`, x0, y0, x1 - x0, y1 - y0, k, (c) => drawRoom(c, g, x0, x1, y0, y1));
    this.bg = renderCache(this.bg, key, 0, 0, g.W, g.H, k, (c) => drawWaterBackground(c, g, t));
    this.sub = renderCache(this.sub, key, 0, g.subBackY - 1.5, g.W, g.H - g.subBackY + 1.5, k, (c) => drawSubstrate(c, g, t));
    this.front = renderCache(this.front, key, -1.5, -1.5, g.W + 3, g.H + 3, k, (c) => drawTankFrameFront(c, g));
    if (!this.caustic) this.caustic = makeCausticTile(this.quality === 'high' ? 128 : 96);
  }

  private decorSprite(d: DecorState, g: TankGeom): Cache {
    const def = getDecor(d.def);
    const fog = (1 - d.z) * 0.32;
    const kb = Math.round(this.k * depthScale(d.z) * 4) / 4;
    const haze = themeOf(this.world.tank).haze;
    const key = `${d.def}|${d.flip ? 1 : 0}|${Math.round(fog * 20)}|${kb}|${haze}`;
    const prev = this.decorSprites.get(d.id) ?? null;
    if (prev && prev.key === key) return prev;
    const w = def.w * 1.5;
    const h = def.h * 1.45;
    const c = renderCache(prev, key, -w / 2, -def.h * 1.3, w, h, kb, (ctx) => {
      if (d.flip) ctx.scale(-1, 1);
      drawDecorStatic(ctx, def, d.id + d.def);
      if (fog > 0.01) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = alpha(haze, fog);
        ctx.fillRect(-w, -def.h * 1.5, w * 2, h * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
    });
    this.decorSprites.set(d.id, c);
    void g;
    return c;
  }

  private renderAlgae(g: TankGeom) {
    const C = BAL.ALGAE_COLS;
    const R = BAL.ALGAE_ROWS;
    const cell = 16;
    const cv = this.algae;
    if (cv.width !== C * cell) {
      cv.width = C * cell;
      cv.height = R * cell;
    }
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!this.blobs.length) {
      // üç farklı yosun lekesi dokusu
      const tints = [
        ['rgba(78,128,52,', 'rgba(60,105,40,'],
        ['rgba(112,128,52,', 'rgba(88,104,38,'],
        ['rgba(92,110,48,', 'rgba(70,86,34,'],
      ];
      const rr = mulberry32(99);
      for (const [c1, c2] of tints) {
        const b = makeCanvas();
        b.width = 48;
        b.height = 48;
        const bc = b.getContext('2d')!;
        for (let i = 0; i < 9; i++) {
          const x = 10 + rr() * 28;
          const y = 10 + rr() * 28;
          const r = 5 + rr() * 9;
          const gr = bc.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, c1 + '0.8)');
          gr.addColorStop(0.6, c2 + '0.45)');
          gr.addColorStop(1, c2 + '0)');
          bc.fillStyle = gr;
          bc.beginPath();
          bc.arc(x, y, r, 0, Math.PI * 2);
          bc.fill();
        }
        bc.fillStyle = c2 + '0.7)';
        for (let i = 0; i < 26; i++) {
          bc.beginPath();
          bc.arc(6 + rr() * 36, 6 + rr() * 36, 0.6 + rr() * 1.3, 0, Math.PI * 2);
          bc.fill();
        }
        this.blobs.push(b);
      }
    }
    const a = this.world.tank.algae;
    const rng = mulberry32(hashString(this.world.tank.id));
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const v = a[r * C + c];
        const seeds = [rng(), rng(), rng(), rng(), rng(), rng()];
        if (v < 0.03) continue;
        const n = v > 0.5 ? 3 : v > 0.2 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const s = cell * (0.9 + v * 1.1) * (0.7 + seeds[k] * 0.6);
          ctx.globalAlpha = Math.min(0.9, v * (0.75 + seeds[k + 3] * 0.4));
          ctx.drawImage(
            this.blobs[Math.floor(seeds[k + 1] * 3) % 3],
            c * cell + cell / 2 - s / 2 + (seeds[k + 2] - 0.5) * cell,
            r * cell + cell / 2 - s / 2 + (seeds[k] - 0.5) * cell,
            s,
            s,
          );
        }
      }
    }
    ctx.globalAlpha = 1;
    void g;
  }

  // ---------------------------------------------------------------- çizim

  render(dt: number) {
    const ctx = this.ctx;
    const g = this.world.geom;
    const t = this.world.tank;
    const cam = this.cam;
    const time = this.world.time;
    const night = !t.light;
    if (Math.abs(cam.vw - this.canvas.width / this.dpr) > 1 || !this.room) this.fitCamera();
    this.ensureCaches(g);
    this.sprites.tick();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#152633';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    cam.apply(ctx);

    const blit = (c: Cache | null) => c && ctx.drawImage(c.canvas, c.x, c.y, c.w, c.h);
    blit(this.room);
    drawLid(ctx, g, t.light, t.equip.light ?? 1, time);

    // ---------------- tank içi
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, g.W, g.H);
    ctx.clip();
    blit(this.bg);
    drawEquipmentBack(ctx, g, t, time);
    if (this.quality === 'high' || !night) drawLightRays(ctx, g, time, night);
    blit(this.sub);
    if (t.light && this.caustic) drawCaustics(ctx, g, this.caustic, time, this.quality === 'high' ? 0.22 : 0.14);
    this.drawSpecks(ctx, g);
    this.drawBubbles(ctx, false);
    this.drawEggs(ctx, g, time);
    this.drawSorted(ctx, g, time, night);
    this.drawFood(ctx);
    this.drawBubbles(ctx, true);
    this.drawFloating(ctx, g, time);
    this.drawCorpses(ctx);
    this.drawLucky(ctx, time);
    this.drawSparks(ctx);
    if (night) {
      ctx.fillStyle = 'rgba(4,12,40,0.58)';
      ctx.fillRect(0, 0, g.W, g.H);
      this.drawNightGlows(ctx, g, time);
    }
    drawSurface(ctx, g, time, night);
    // Yosun (ön cam)
    this.algaeT -= dt;
    const sum = t.algae.reduce((s, v) => s + v, 0);
    if (this.algaeSum < 0 || (Math.abs(sum - this.algaeSum) > 0.02 && this.algaeT <= 0)) {
      this.renderAlgae(g);
      this.algaeSum = sum;
      this.algaeT = this.tool === 'sponge' ? 0 : 0.5;
    }
    ctx.drawImage(this.algae, 0, 0, g.W, g.H);
    ctx.restore();

    blit(this.front);
    this.drawOverlay(ctx, g, time);
    this.drawTexts(ctx);
  }

  private drawSpecks(ctx: CanvasRenderingContext2D, g: TankGeom) {
    const cols = ['rgba(70,55,35,0.75)', 'rgba(55,70,40,0.7)', 'rgba(90,70,45,0.8)'];
    for (const s of this.world.specks) {
      let y = groundY(g, s.z);
      let x = s.x;
      let r = s.r;
      if (s.suck !== undefined) {
        y -= s.suck * 3;
        x += (this.cursor.x - x) * s.suck;
        r *= 1 - s.suck;
      }
      ctx.fillStyle = cols[s.c % cols.length];
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.4, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBubbles(ctx: CanvasRenderingContext2D, front: boolean) {
    ctx.lineWidth = 0.06;
    for (const b of this.world.bubbles) {
      if (front !== b.z >= 0.5) continue;
      ctx.strokeStyle = 'rgba(230,250,255,0.75)';
      ctx.fillStyle = 'rgba(200,240,255,0.18)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawEggs(ctx: CanvasRenderingContext2D, g: TankGeom, time: number) {
    for (const c of this.world.tank.clutches) {
      if (c.stage !== 'eggs') continue;
      let pos = c.site ? this.world.sitePos(c.site) : null;
      const parent = this.world.agents.get(c.parents[0]);
      if (!pos && parent) pos = { x: parent.x, y: parent.y, z: parent.z };
      if (!pos) continue;
      const rng = mulberry32(hashString(c.id));
      const nest = this.world.tank.plants.some((p) => p.id === c.site && getPlant(p.def).type === 'floating');
      const cy = nest ? g.surfaceY + 0.8 : pos.y;
      for (let i = 0; i < 16; i++) {
        const x = pos.x + (rng() - 0.5) * 3;
        const y = cy + (rng() - 0.5) * 1.6;
        ctx.fillStyle = nest ? 'rgba(255,255,255,0.55)' : `rgba(255,${200 + Math.floor(rng() * 40)},150,${0.8 + Math.sin(time * 2 + i) * 0.1})`;
        ctx.beginPath();
        ctx.arc(x, y, nest ? 0.35 : 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawSorted(ctx: CanvasRenderingContext2D, g: TankGeom, time: number, night: boolean) {
    const list = this.drawables;
    list.length = 0;
    const t = this.world.tank;
    for (const d of t.decor) list.push({ z: d.z, kind: 0, ref: d });
    for (const p of t.plants) if (getPlant(p.def).type !== 'floating') list.push({ z: p.z, kind: 1, ref: p });
    for (const a of this.world.agents.values()) list.push({ z: a.z + (a.walker ? 0.001 : 0.002), kind: 2, ref: a });
    list.sort((a, b) => a.z - b.z);
    const haze = themeOf(t).haze;
    for (const it of list) {
      if (it.kind === 0) this.drawDecor(ctx, it.ref as DecorState, g, time, night);
      else if (it.kind === 1) {
        const p = it.ref as PlantState;
        const def = getPlant(p.def);
        const shape = plantShape(p.id, def, p.g, (1 - p.z) * 0.3, haze);
        drawPlant(ctx, def, shape, p.g, p.x, groundY(g, p.z), depthScale(p.z), time, !!p.flip, g.surfaceY);
        if (this.tool === 'decor' && this.decorSel === p.id) this.drawSelBox(ctx, p.x, groundY(g, p.z), def.w, def.h * (0.35 + 0.65 * p.g));
        if (p.g >= 1 && this.tool !== 'decor') this.drawTrimBadge(ctx, p.x, groundY(g, p.z) - def.h * depthScale(p.z) - 1, time);
      } else this.drawAgent(ctx, it.ref as Agent, night);
    }
  }

  private drawDecor(ctx: CanvasRenderingContext2D, d: DecorState, g: TankGeom, time: number, night: boolean) {
    const def = getDecor(d.def);
    const s = this.decorSprite(d, g);
    const k = depthScale(d.z);
    const by = groundY(g, d.z);
    ctx.save();
    ctx.translate(d.x, by);
    ctx.scale(k, k);
    ctx.drawImage(s.canvas, s.x, s.y, s.w, s.h);
    if (d.flip) ctx.scale(-1, 1);
    drawDecorDynamic(ctx, def, { time, night, pearlReady: !!this.game.state.flags[`pearlReady:${d.id}`], seed: (hashString(d.id) % 100) / 100 });
    ctx.restore();
    if (this.tool === 'decor' && this.decorSel === d.id) this.drawSelBox(ctx, d.x, by, def.w * k, def.h * k);
  }

  private drawSelBox(ctx: CanvasRenderingContext2D, x: number, by: number, w: number, h: number) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.setLineDash([0.8, 0.6]);
    ctx.lineWidth = 0.18;
    ctx.strokeRect(x - w / 2 - 0.6, by - h - 0.6, w + 1.2, h + 1.2);
    ctx.restore();
  }

  /** Olgun bitki: budanabilir işareti (küçük makas rozeti) — ekran pikseli sabit boyutlu */
  private drawTrimBadge(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
    const u = 11 / this.cam.scale; // ~11 px yarıçap
    const bob = Math.sin(time * 2.5 + x) * u * 0.15;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = 'rgba(22,101,52,0.85)';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = u * 0.12;
    ctx.beginPath();
    ctx.arc(0, 0, u, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // makas
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = u * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-u * 0.45, -u * 0.45);
    ctx.lineTo(u * 0.35, u * 0.25);
    ctx.moveTo(u * 0.45, -u * 0.45);
    ctx.lineTo(-u * 0.35, u * 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-u * 0.4, u * 0.38, u * 0.18, 0, Math.PI * 2);
    ctx.arc(u * 0.4, u * 0.38, u * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawAgent(ctx: CanvasRenderingContext2D, a: Agent, night: boolean) {
    const size = this.world.sizeOf(a.sp, a.fish) * depthScale(a.z);
    const selected = this.selectedId === a.id;
    if (selected) {
      const pulse = 0.5 + 0.5 * Math.sin(this.world.time * 5);
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + pulse * 0.4})`;
      ctx.lineWidth = 0.15 + pulse * 0.08;
      ctx.beginPath();
      ctx.ellipse(a.x, a.y, size * 0.62, size * (a.walker ? 0.45 : 0.36), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha = 0.8 + 0.2 * a.z;
    ctx.translate(a.x, a.y);
    if (a.sp.kind === 'fish') {
      const turn = Math.abs(a.turn) < 0.12 ? 0.12 * Math.sign(a.turn || 1) : a.turn;
      const tilt = clamp(Math.atan2(a.vy, Math.abs(a.vx) + 0.6) * 0.55, -0.45, 0.45);
      ctx.rotate(tilt * Math.sign(turn));
      const puff = 1 + a.puff * 0.45;
      ctx.scale(size * turn * puff, size * puff * (1 + a.puff * 0.25));
      const { assets, entry, stage } = this.sprites.get(this.ctx, a.fish, a.sp, size * this.k * puff);
      const flap = a.mode === 'food' ? 1.5 : 1;
      drawFins(ctx, assets, a.phase, 'back', stage, flap);
      ctx.drawImage(entry.canvas, entry.box.x, entry.box.y, entry.box.w, entry.box.h);
      drawFins(ctx, assets, a.phase, 'front', stage, flap);
      if (a.puff > 0.1) {
        ctx.strokeStyle = `rgba(80,60,30,${a.puff})`;
        ctx.lineWidth = 0.015;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const an = (i / 16) * Math.PI * 2;
          ctx.moveTo(Math.cos(an) * 0.33, Math.sin(an) * assets.hh * 0.95);
          ctx.lineTo(Math.cos(an) * 0.42, Math.sin(an) * assets.hh * 1.2);
        }
        ctx.stroke();
      }
    } else {
      const look: CreatureLook = creatureLook(a.sp, a.fish.var);
      const flip = a.sp.kind === 'jelly' || a.sp.kind === 'starfish' ? 1 : Math.abs(a.turn) < 0.2 ? 0.2 * Math.sign(a.turn || 1) : a.turn;
      ctx.scale(size * flip, size);
      drawCreature(ctx, a.sp.kind, look, { phase: a.phase, moving: a.walk || Math.min(1, Math.hypot(a.vx, a.vy)), swim: a.mode === 'breathe' ? 1 : 0, pulse: a.pulse, night });
    }
    ctx.restore();
  }

  private drawFood(ctx: CanvasRenderingContext2D) {
    for (const f of this.world.food) this.drawFoodParticle(ctx, f);
  }

  private drawFoodParticle(ctx: CanvasRenderingContext2D, f: FoodParticle) {
    const def = getFood(f.food);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.fillStyle = def.color;
    switch (def.shape) {
      case 'flake':
        ctx.beginPath();
        ctx.moveTo(-0.35, -0.1);
        ctx.lineTo(0.1, -0.25);
        ctx.lineTo(0.3, 0.1);
        ctx.lineTo(-0.1, 0.22);
        ctx.closePath();
        ctx.fill();
        if (f.food === 'golden') {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillRect(-0.05, -0.05, 0.1, 0.1);
        }
        break;
      case 'pellet':
        ctx.beginPath();
        ctx.arc(0, 0, 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(-0.08, -0.08, 0.08, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'tablet':
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.6, 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'worm':
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 0.14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-0.4, 0);
        ctx.quadraticCurveTo(-0.1, -0.3, 0.1, 0);
        ctx.quadraticCurveTo(0.25, 0.25, 0.4, 0);
        ctx.stroke();
        break;
      case 'shrimp':
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 0.16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, 0.25, 0.3, Math.PI * 1.6);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  private drawFloating(ctx: CanvasRenderingContext2D, g: TankGeom, time: number) {
    const haze = themeOf(this.world.tank).haze;
    for (const p of this.world.tank.plants) {
      const def = getPlant(p.def);
      if (def.type !== 'floating') continue;
      const shape = plantShape(p.id, def, p.g, 0, haze);
      drawPlant(ctx, def, shape, p.g, p.x, g.surfaceY, 1, time, !!p.flip, g.surfaceY);
      if (this.tool === 'decor' && this.decorSel === p.id) this.drawSelBox(ctx, p.x, g.surfaceY + 3, def.w, 4);
    }
  }

  private drawCorpses(ctx: CanvasRenderingContext2D) {
    for (const c of this.world.corpses) {
      const size = c.sp.size * (0.35 + 0.65 * c.fish.g);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - c.t / 12) * 0.8;
      ctx.translate(c.x, c.y);
      ctx.scale(size * c.face, -size);
      if (c.sp.kind === 'fish') {
        const { assets, entry, stage } = this.sprites.get(this.ctx, c.fish, c.sp, size * this.k);
        drawFins(ctx, assets, 0, 'back', stage);
        ctx.drawImage(entry.canvas, entry.box.x, entry.box.y, entry.box.w, entry.box.h);
      } else {
        drawCreature(ctx, c.sp.kind, creatureLook(c.sp, c.fish.var), { phase: 0, moving: 0 });
      }
      ctx.restore();
    }
  }

  private drawLucky(ctx: CanvasRenderingContext2D, time: number) {
    for (const l of this.world.lucky) {
      const r = 1.6 + Math.sin(time * 4 + l.id) * 0.12;
      const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r * 2.2);
      gr.addColorStop(0, l.pearls ? 'rgba(233,213,255,0.7)' : 'rgba(255,224,130,0.7)');
      gr.addColorStop(1, 'rgba(255,224,130,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(l.x, l.y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      ctx.arc(l.x, l.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = l.pearls ? '#f5f0ff' : '#f7c948';
      ctx.beginPath();
      ctx.arc(l.x, l.y, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = l.pearls ? '#c4b5fd' : '#b8860b';
      ctx.lineWidth = 0.1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(l.x - r * 0.4, l.y - r * 0.4, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSparks(ctx: CanvasRenderingContext2D) {
    for (const s of this.world.sparks) {
      const a = 1 - s.t / s.life;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = s.c;
      if (s.kind === 'heart') {
        const r = s.r;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + r * 0.8);
        ctx.bezierCurveTo(s.x - r * 1.4, s.y - r * 0.2, s.x - r * 0.5, s.y - r * 1.2, s.x, s.y - r * 0.4);
        ctx.bezierCurveTo(s.x + r * 0.5, s.y - r * 1.2, s.x + r * 1.4, s.y - r * 0.2, s.x, s.y + r * 0.8);
        ctx.fill();
      } else if (s.kind === 'star') {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (1 - s.t / s.life * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.r, s.r * 0.7, s.t * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawNightGlows(ctx: CanvasRenderingContext2D, g: TankGeom, time: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const a of this.world.agents.values()) {
      const look = a.sp.look as { glow?: string };
      const v = a.fish.var ? a.sp.variants?.find((x) => x.id === a.fish.var) : undefined;
      const glow = (v?.look as { glow?: string } | undefined)?.glow ?? look.glow;
      if (!glow) continue;
      const size = this.world.sizeOf(a.sp, a.fish) * depthScale(a.z);
      const gr = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, size * 0.9);
      gr.addColorStop(0, alpha(glow, 0.55));
      gr.addColorStop(1, alpha(glow, 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(a.x, a.y, size * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const d of this.world.tank.decor) {
      const def = getDecor(d.def);
      if (!def.glow) continue;
      const k = depthScale(d.z);
      const cx = d.x;
      const cy = groundY(g, d.z) - def.h * k * 0.5;
      const r = Math.max(def.w, def.h) * k * (0.9 + 0.1 * Math.sin(time * 1.5));
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, alpha(def.glow, 0.45));
      gr.addColorStop(1, alpha(def.glow, 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, g: TankGeom, time: number) {
    const c = this.cursor;
    if (!c.active) return;
    if (this.tool === 'sponge') {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(Math.sin(time * 10) * 0.08);
      const w = Math.max(3.2, g.H * 0.12);
      const h = w * 0.62;
      ctx.fillStyle = '#f7d046';
      ctx.fillRect(-w / 2, -h / 2, w, h * 0.7);
      ctx.fillStyle = '#3f9c4a';
      ctx.fillRect(-w / 2, h * 0.2, w, h * 0.3);
      ctx.fillStyle = 'rgba(180,140,20,0.5)';
      for (let i = 0; i < 8; i++) ctx.fillRect(-w / 2 + (i % 4) * w * 0.25 + 0.3, -h / 2 + Math.floor(i / 4) * h * 0.3 + 0.3, 0.3, 0.3);
      ctx.restore();
    } else if (this.tool === 'vacuum') {
      const gy = clamp(c.y, g.subBackY, g.H - 0.5);
      ctx.strokeStyle = 'rgba(220,240,250,0.55)';
      ctx.lineWidth = Math.max(1.2, g.H * 0.045);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c.x + 2, -1);
      ctx.lineTo(c.x, gy - 1);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 0.12;
      ctx.stroke();
      ctx.fillStyle = 'rgba(40,40,40,0.8)';
      ctx.fillRect(c.x + 1.2, -2.5, 1.8, 1.5);
    }
  }

  private drawTexts(ctx: CanvasRenderingContext2D) {
    const cam = this.cam;
    cam.applyScreen(ctx);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.world.texts) {
      const a = 1 - Math.max(0, (t.t - t.life * 0.6) / (t.life * 0.4));
      const sx = cam.sx(t.x);
      const sy = cam.sy(t.y);
      ctx.globalAlpha = a;
      ctx.font = `800 ${Math.round(13 * t.size)}px Baloo 2 Variable, Nunito Variable, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,20,40,0.7)';
      ctx.strokeText(t.text, sx, sy);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, sx, sy);
    }
    ctx.globalAlpha = 1;
  }
}
