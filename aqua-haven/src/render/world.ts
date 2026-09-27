import type { Game } from '../game/game';
import type { FishState, SpeciesDef, TankState } from '../game/types';
import { getSpecies } from '../data/species';
import { getDecor } from '../data/decor';
import { getPlant } from '../data/plants';
import { getFood } from '../data/foods';
import { BAL } from '../game/balance';
import * as A from '../game/actions';
import { depthScale, groundY, swimBounds, tankGeom, type TankGeom } from './layout';
import { creatureHeight } from './draw/creatures';
import { decorBubbleEmitter } from './draw/decor';
import { hasTrait } from '../game/sim/fish';
import { chance, clamp, rand } from '../game/util';

export type AgentMode = 'wander' | 'food' | 'surface' | 'court' | 'enter' | 'breathe' | 'glass';

export interface Agent {
  id: string;
  sp: SpeciesDef;
  fish: FishState;
  walker: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  face: number;
  turn: number;
  phase: number;
  tx: number;
  ty: number;
  tz: number;
  wait: number;
  mode: AgentMode;
  target: FoodParticle | null;
  eatCd: number;
  puff: number;
  pulse: number;
  walk: number;
  timer: number;
  ox: number;
  oy: number;
  xpAcc: number;
  xpT: number;
  react: number;
}

export interface FoodParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  food: string;
  bottom: boolean;
  bt: number;
  rot: number;
  sink: number;
  dead: boolean;
}

export interface Bubble {
  x: number;
  y: number;
  z: number;
  r: number;
  vy: number;
  ph: number;
}

export interface Lucky {
  id: number;
  x: number;
  y: number;
  coins: number;
  pearls: number;
  t: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
  life: number;
  size: number;
}

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  kind: 'algae' | 'heart' | 'star' | 'drop' | 'dirt';
  c: string;
  r: number;
}

export interface Speck {
  x: number;
  z: number;
  r: number;
  c: number;
  suck?: number;
}

export interface Corpse {
  fish: FishState;
  sp: SpeciesDef;
  x: number;
  y: number;
  z: number;
  t: number;
  face: number;
}

let luckyId = 1;

export class World {
  game: Game;
  tank!: TankState;
  geom!: TankGeom;
  agents = new Map<string, Agent>();
  food: FoodParticle[] = [];
  bubbles: Bubble[] = [];
  lucky: Lucky[] = [];
  texts: FloatText[] = [];
  sparks: Spark[] = [];
  specks: Speck[] = [];
  corpses: Corpse[] = [];
  time = 0;
  private emitT = new Map<string, number>();
  private airT = 0;
  onFx: (kind: 'eat' | 'splash' | 'pop' | 'lucky' | 'suck') => void = () => {};

  constructor(game: Game) {
    this.game = game;
    this.reset();
    const ev = game.events;
    ev.on('fishAdded', (e) => {
      if (e.tankId !== this.tank.id) return;
      const a = this.addAgent(e.fish);
      if (e.source === 'buy' || e.source === 'egg' || e.source === 'gift' || e.source === 'move') {
        if (!a.walker) {
          a.y = this.geom.surfaceY - 1;
          a.mode = 'enter';
          a.vy = 4;
        } else {
          a.y = this.geom.surfaceY + 2;
          a.mode = 'enter';
          a.vy = 3;
        }
        this.splash(a.x);
      } else if (e.source === 'bred') {
        for (let i = 0; i < 6; i++) this.spark(a.x, a.y, 'star', '#fff6b0');
      }
    });
    ev.on('fishRemoved', (e) => {
      if (e.tankId !== this.tank.id) return;
      this.agents.delete(e.fishId);
    });
    ev.on('fishDied', (e) => {
      if (e.tankId !== this.tank.id) return;
      const a = this.agents.get(e.fish.id);
      if (a) this.corpses.push({ fish: e.fish, sp: a.sp, x: a.x, y: a.y, z: a.z, t: 0, face: a.face });
    });
    ev.on('lucky', (e) => {
      if (e.tankId !== this.tank.id) return;
      const a = this.agents.get(e.fishId);
      if (!a) return;
      this.lucky.push({ id: luckyId++, x: a.x, y: a.y - a.sp.size * 0.2, coins: e.coins, pearls: e.pearls, t: 0 });
      this.onFx('lucky');
    });
    ev.on('feederFed', (e) => {
      if (e.tankId !== this.tank.id) return;
      const n = Math.ceil(this.tank.fish.length / 3);
      for (let i = 0; i < n; i++) this.spawnFood(rand(4, this.geom.W - 4), e.food);
    });
    ev.on('clutchStarted', (e) => {
      if (e.tankId !== this.tank.id) return;
      for (const c of this.tank.clutches) for (const pid of c.parents) {
        const a = this.agents.get(pid);
        if (a) for (let i = 0; i < 4; i++) this.spark(a.x, a.y, 'heart', '#ff6b9a');
      }
    });
    ev.on('decorChanged', () => this.syncSpecks());
    ev.on('waterChanged', (e) => {
      if (e.tankId !== this.tank.id) return;
      this.syncSpecks(true);
      for (let i = 0; i < 30; i++) this.bubble(rand(0, this.geom.W), rand(this.geom.H * 0.3, this.geom.subBackY), rand(0, 1), rand(0.2, 0.6));
    });
  }

  reset() {
    this.tank = this.game.tank;
    this.geom = tankGeom(this.tank);
    this.agents.clear();
    this.food = [];
    this.bubbles = [];
    this.lucky = [];
    this.corpses = [];
    this.sparks = [];
    this.specks = [];
    for (const f of this.tank.fish) this.addAgent(f);
    this.syncSpecks(true);
  }

  // ---------------------------------------------------------------- ajanlar

  private addAgent(f: FishState): Agent {
    const sp = getSpecies(f.sp);
    const walker = ['shrimp', 'snail', 'crab', 'crayfish', 'axolotl', 'starfish', 'frog'].includes(sp.kind);
    const size = this.sizeOf(sp, f);
    const z = rand(0.1, 0.95);
    const b = swimBounds(this.geom, size, z);
    const a: Agent = {
      id: f.id,
      sp,
      fish: f,
      walker,
      x: rand(b.x0, b.x1),
      y: walker ? this.walkY(sp, size, z) : rand(b.y0, b.y1),
      z,
      vx: 0,
      vy: 0,
      face: Math.random() < 0.5 ? -1 : 1,
      turn: 1,
      phase: rand(0, 6),
      tx: 0,
      ty: 0,
      tz: z,
      wait: 0,
      mode: 'wander',
      target: null,
      eatCd: 0,
      puff: 0,
      pulse: 0,
      walk: 0,
      timer: rand(20, 60),
      ox: rand(-1, 1),
      oy: rand(-1, 1),
      xpAcc: 0,
      xpT: 0,
      react: 0,
    };
    a.turn = a.face;
    this.pickTarget(a);
    this.agents.set(f.id, a);
    return a;
  }

  sizeOf(sp: SpeciesDef, f: FishState) {
    return sp.size * (0.35 + 0.65 * f.g);
  }

  private walkY(sp: SpeciesDef, size: number, z: number) {
    const h = creatureHeight(sp.kind) * size;
    return groundY(this.geom, z) - h * 0.5;
  }

  private sync() {
    const ids = new Set(this.tank.fish.map((f) => f.id));
    for (const id of this.agents.keys()) if (!ids.has(id)) this.agents.delete(id);
    for (const f of this.tank.fish) {
      const a = this.agents.get(f.id);
      if (!a) this.addAgent(f);
      else a.fish = f;
    }
  }

  private pickTarget(a: Agent) {
    const g = this.geom;
    const size = this.sizeOf(a.sp, a.fish);
    const night = !this.tank.light && !hasTrait(a.sp, 'nocturnal');
    if (a.walker) {
      if (a.sp.kind === 'snail' && chance(0.35)) {
        a.mode = 'glass';
        a.tz = 0;
        a.tx = rand(2, g.W - 2);
        a.ty = rand(g.surfaceY + 2, g.subBackY - 2);
        return;
      }
      if (a.mode === 'glass') a.mode = 'wander';
      a.tz = clamp(a.z + rand(-0.35, 0.35), 0.05, 1);
      a.tx = clamp(a.x + rand(-g.W * 0.35, g.W * 0.35), 2, g.W - 2);
      a.ty = this.walkY(a.sp, size, a.tz);
      return;
    }
    a.tz = clamp(a.z + rand(-0.4, 0.4), 0.02, 1);
    const b = swimBounds(g, size, a.tz);
    let y0 = b.y0;
    let y1 = b.y1;
    const zone = night ? 'bottom' : a.sp.zone;
    const hgt = b.y1 - b.y0;
    if (zone === 'top') y1 = b.y0 + hgt * 0.45;
    else if (zone === 'bottom') y0 = b.y0 + hgt * 0.65;
    else if (zone === 'mid') {
      y0 = b.y0 + hgt * 0.15;
      y1 = b.y0 + hgt * 0.85;
    }
    // Sürü: lider hedefini takip et
    if (a.sp.school && (this.game.state.tanks.length || true)) {
      const leader = this.leaderOf(a);
      if (leader && leader !== a) {
        a.tx = clamp(leader.tx + a.ox * size * 1.6, b.x0, b.x1);
        a.ty = clamp(leader.ty + a.oy * size * 0.8, y0, y1);
        a.tz = clamp(leader.tz + a.ox * 0.1, 0, 1);
        return;
      }
    }
    a.tx = rand(b.x0, b.x1);
    a.ty = rand(y0, Math.max(y0 + 0.1, y1));
  }

  private leaderOf(a: Agent): Agent | null {
    let best: Agent | null = null;
    for (const o of this.agents.values()) {
      if (o.sp.id !== a.sp.id) continue;
      if (!best || o.id < best.id) best = o;
    }
    return best;
  }

  // ---------------------------------------------------------------- yem

  spawnFood(x: number, foodId: string) {
    const f = getFood(foodId);
    const g = this.geom;
    for (let i = 0; i < f.particles; i++) {
      this.food.push({
        x: clamp(x + rand(-1.2, 1.2), 0.5, g.W - 0.5),
        y: g.surfaceY + rand(-0.2, 0.3),
        z: rand(0.2, 0.9),
        vx: rand(-0.4, 0.4),
        vy: 0,
        food: foodId,
        bottom: false,
        bt: 0,
        rot: rand(0, 6),
        sink: f.sink * rand(0.8, 1.2),
        dead: false,
      });
    }
  }

  dropFoodAt(x: number): boolean {
    const r = A.dropFood(this.game);
    if (!r.ok || !r.value) return false;
    this.spawnFood(x, r.value);
    this.splash(x, 0.5);
    return true;
  }

  // ---------------------------------------------------------------- efektler

  splash(x: number, k = 1) {
    this.onFx('splash');
    for (let i = 0; i < 8 * k; i++) {
      this.sparks.push({ x: x + rand(-1, 1), y: this.geom.surfaceY, vx: rand(-3, 3), vy: rand(-6, -2), t: 0, life: rand(0.4, 0.8), kind: 'drop', c: '#e6f7ff', r: rand(0.15, 0.3) });
    }
    for (let i = 0; i < 6 * k; i++) this.bubble(x + rand(-1.5, 1.5), this.geom.surfaceY + rand(0.5, 3), rand(0.3, 1), rand(0.15, 0.4));
  }

  spark(x: number, y: number, kind: Spark['kind'], c: string) {
    this.sparks.push({ x, y, vx: rand(-2, 2), vy: kind === 'heart' ? rand(-3, -1.5) : rand(-3, 1), t: 0, life: kind === 'heart' ? rand(1, 1.6) : rand(0.5, 1), kind, c, r: kind === 'heart' ? rand(0.5, 0.9) : rand(0.2, 0.45) });
  }

  bubble(x: number, y: number, z: number, r: number) {
    if (this.bubbles.length > 260) return;
    this.bubbles.push({ x, y, z, r, vy: -(2.5 + r * 5), ph: rand(0, 6) });
  }

  text(x: number, y: number, text: string, color: string, size = 1) {
    this.texts.push({ x, y, text, color, t: 0, life: 1.3, size });
  }

  // ---------------------------------------------------------------- kir

  syncSpecks(regen = false) {
    const g = this.geom;
    const target = Math.min(140, Math.round(this.tank.dirt * 1.3));
    if (regen) this.specks = [];
    while (this.specks.length < target) {
      this.specks.push({ x: rand(0.5, g.W - 0.5), z: rand(0, 1), r: rand(0.15, 0.4), c: Math.floor(rand(0, 3)) });
    }
    while (this.specks.length > target + 3) this.specks.splice(Math.floor(Math.random() * this.specks.length), 1);
  }

  // ---------------------------------------------------------------- etkileşim

  /** Dokunulan balık (en öndeki). Dünya koordinatı ve ekran piksel ölçeği ile. */
  fishAt(x: number, y: number, pxPerUnit: number): Agent | null {
    let best: Agent | null = null;
    let bestZ = -1;
    const minR = 22 / pxPerUnit;
    for (const a of this.agents.values()) {
      const size = this.sizeOf(a.sp, a.fish) * depthScale(a.z);
      const rx = Math.max(minR, size * 0.55);
      const ry = Math.max(minR, size * (a.walker ? 0.45 : 0.3) + 0.4);
      const dx = (x - a.x) / rx;
      const dy = (y - a.y) / ry;
      if (dx * dx + dy * dy <= 1 && a.z > bestZ) {
        best = a;
        bestZ = a.z;
      }
    }
    return best;
  }

  luckyAt(x: number, y: number, pxPerUnit: number): Lucky | null {
    const r = Math.max(2.6, 30 / pxPerUnit);
    return this.lucky.find((l) => Math.hypot(l.x - x, l.y - y) < r) ?? null;
  }

  collectLucky(l: Lucky) {
    this.lucky = this.lucky.filter((x) => x.id !== l.id);
    A.collectLucky(this.game, l.coins, l.pearls);
    this.text(l.x, l.y, `+${l.coins}`, '#ffd54f', 1.2);
    if (l.pearls) this.text(l.x, l.y - 2, `+${l.pearls} 💎`, '#e9d5ff', 1.2);
    for (let i = 0; i < 10; i++) this.spark(l.x, l.y, 'star', '#ffe082');
    this.onFx('pop');
  }

  poke(a: Agent) {
    a.react = 1;
    // kaçış hamlesi
    if (!a.walker) {
      a.vx += a.face * -3;
      a.vy -= 1.5;
      if ((a.sp.look as { body?: string }).body === 'puffer') a.puff = 1;
    }
  }

  /** Sünger: yarıçap içindeki yosun hücrelerini siler */
  wipe(x: number, y: number, r: number, strength: number): number {
    const g = this.geom;
    const C = BAL.ALGAE_COLS;
    const R = BAL.ALGAE_ROWS;
    const cw = g.W / C;
    const ch = g.H / R;
    let removed = 0;
    const c0 = Math.max(0, Math.floor((x - r) / cw));
    const c1 = Math.min(C - 1, Math.floor((x + r) / cw));
    const r0 = Math.max(0, Math.floor((y - r) / ch));
    const r1 = Math.min(R - 1, Math.floor((y + r) / ch));
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const cx = (col + 0.5) * cw;
        const cy = (row + 0.5) * ch;
        const d = Math.hypot((cx - x) / Math.max(cw, r), (cy - y) / Math.max(ch, r));
        if (d > 1.2) continue;
        const i = row * C + col;
        const amt = this.tank.algae[i];
        if (amt <= 0.01) continue;
        const rem = A.wipeAlgae(this.game, this.tank, i, strength * (1.2 - d));
        removed += rem;
        if (rem > 0.05 && chance(0.6)) this.spark(cx + rand(-cw / 2, cw / 2), cy, 'algae', '#4c8a3c');
      }
    }
    return removed;
  }

  /** Sifon: zemindeki kir lekelerini çeker */
  vacuum(x: number, y: number, r: number): number {
    const g = this.geom;
    let n = 0;
    const per = this.specks.length ? this.tank.dirt / this.specks.length : 0;
    for (const s of this.specks) {
      if (s.suck !== undefined) continue;
      const sy = groundY(g, s.z);
      if (Math.abs(s.x - x) < r && Math.abs(sy - y) < r * 1.2) {
        s.suck = 0;
        n++;
        A.vacuumDirt(this.game, this.tank, per);
      }
    }
    if (n) this.onFx('suck');
    // dipteki yemleri de temizle
    for (const f of this.food) if (f.bottom && Math.abs(f.x - x) < r) f.dead = true;
    return n;
  }

  // ---------------------------------------------------------------- güncelleme

  update(dt: number) {
    this.time += dt;
    if (this.tank !== this.game.tank) this.reset();
    this.geom = tankGeom(this.tank);
    this.sync();
    this.updateFood(dt);
    for (const a of this.agents.values()) this.updateAgent(a, dt);
    this.updateCorpses(dt);
    this.updateBubbles(dt);
    this.updateEmitters(dt);
    this.updateLucky(dt);
    this.updateSparks(dt);
    // kir lekeleri: tankın kir değerini izle
    if (Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)) this.syncSpecks();
    for (let i = this.specks.length - 1; i >= 0; i--) {
      const s = this.specks[i];
      if (s.suck !== undefined) {
        s.suck += dt * 3;
        if (s.suck >= 1) this.specks.splice(i, 1);
      }
    }
  }

  private updateFood(dt: number) {
    const g = this.geom;
    for (const f of this.food) {
      if (f.dead) continue;
      if (!f.bottom) {
        f.vy = Math.min(f.sink, f.vy + dt * 2);
        f.y += f.vy * dt;
        f.x += (f.vx + Math.sin(this.time * 1.5 + f.rot) * 0.3) * dt;
        f.rot += dt;
        const gy = groundY(g, f.z) - 0.2;
        if (f.y >= gy) {
          f.y = gy;
          f.bottom = true;
        }
      } else {
        f.bt += dt;
        if (f.bt > BAL.FOOD_BOTTOM_LIFE) {
          f.dead = true;
          this.tank.dirt = Math.min(100, this.tank.dirt + BAL.FOOD_DECAY_DIRT);
          this.specks.push({ x: f.x, z: f.z, r: rand(0.2, 0.4), c: 2 });
        }
      }
    }
    this.food = this.food.filter((f) => !f.dead);
  }

  private nearestFood(a: Agent): FoodParticle | null {
    let best: FoodParticle | null = null;
    let bd = Infinity;
    const g = this.geom;
    const size = this.sizeOf(a.sp, a.fish);
    const veryHungry = a.fish.food < 30;
    for (const f of this.food) {
      if (f.dead) continue;
      if (a.walker) {
        if (!f.bottom) continue;
      } else {
        if (a.sp.zone === 'bottom' && !veryHungry && f.y < g.H * 0.45 && !f.bottom) continue;
        if (a.sp.zone === 'top' && !veryHungry && f.bottom) continue;
        if (f.bottom && a.sp.kind === 'jelly') continue;
      }
      const d = Math.hypot(f.x - a.x, (f.y - a.y) * 1.3) + Math.abs(f.z - a.z) * 4;
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    if (best && a.walker && bd > size * 12 + 15) return null;
    return best;
  }

  private eat(a: Agent, f: FoodParticle) {
    f.dead = true;
    const xp = A.eatParticle(this.game, this.tank, a.id, f.food);
    a.eatCd = 0.35;
    a.xpAcc += xp;
    this.onFx('eat');
    if (chance(0.5)) this.spark(f.x, f.y, 'star', '#fff8c4');
  }

  private updateAgent(a: Agent, dt: number) {
    const g = this.geom;
    const f = a.fish;
    const sp = a.sp;
    const size = this.sizeOf(sp, f);
    const nightSlow = !this.tank.light && !hasTrait(sp, 'nocturnal') ? 0.45 : 1;
    const hungry = f.food < BAL.FULL_FOOD;
    a.eatCd -= dt;
    a.react = Math.max(0, a.react - dt * 2);
    a.puff = Math.max(0, a.puff - dt * 0.35);
    a.xpT -= dt;
    if (a.xpAcc > 0 && a.xpT <= 0) {
      const shown = Math.round(a.xpAcc * 10) / 10;
      if (shown >= 0.5) this.text(a.x, a.y - size * 0.4, `+${shown >= 10 ? Math.round(shown) : shown} GP`, '#a5f3fc', 0.8);
      a.xpAcc = 0;
      a.xpT = 1.2;
    }
    a.z += clamp(a.tz - a.z, -0.1 * dt, 0.1 * dt);

    // Yem arama
    if (hungry && a.eatCd <= 0 && this.food.length && a.mode !== 'enter' && a.mode !== 'breathe') {
      if (!a.target || a.target.dead) a.target = this.nearestFood(a);
      if (a.target) a.mode = 'food';
    } else if (a.mode === 'food' && (!hungry || !a.target || a.target.dead)) {
      a.mode = 'wander';
      a.target = null;
      this.pickTarget(a);
    }

    if (a.walker) {
      this.updateWalker(a, dt, size, nightSlow);
      return;
    }

    // Kur yapma
    const court = this.tank.clutches.find((c) => c.stage === 'court' && c.parents.includes(a.id) && !c.paused);
    if (court && a.mode !== 'food' && a.mode !== 'enter') {
      a.mode = 'court';
      const other = this.agents.get(court.parents.find((p) => p !== a.id)!);
      const site = court.site ? this.sitePos(court.site) : null;
      const cx = site?.x ?? other?.x ?? a.x;
      const cy = site ? site.y - size : other?.y ?? a.y;
      const ang = this.time * 0.8 + (a.fish.sex === 'M' ? 0 : Math.PI);
      a.tx = cx + Math.cos(ang) * size * 1.2;
      a.ty = cy + Math.sin(ang) * size * 0.5;
      a.tz = site?.z ?? a.tz;
      if (chance(dt * 0.8)) this.spark(a.x, a.y - size * 0.3, 'heart', '#ff7aa2');
    } else if (a.mode === 'court') {
      a.mode = 'wander';
      this.pickTarget(a);
    }

    // Oksijen düşükse yüzeyde nefes
    if (this.tank.oxygen < 28 && a.mode === 'wander' && chance(dt * 0.3)) {
      a.mode = 'surface';
      a.timer = rand(3, 6);
      a.tx = a.x + rand(-5, 5);
      a.ty = g.surfaceY + size * 0.35;
    }
    if (a.mode === 'surface') {
      a.timer -= dt;
      if (a.timer <= 0 || this.tank.oxygen >= 32) {
        a.mode = 'wander';
        this.pickTarget(a);
      }
    }

    // Hedef ve hız
    let speed = sp.speed * Math.max(1.3, size) * 0.55 * nightSlow;
    if (sp.kind === 'jelly') speed = size * 0.12;
    if (sp.kind === 'seahorse') speed = Math.max(0.5, size * 0.1);
    let tx = a.tx;
    let ty = a.ty;
    if (a.mode === 'food' && a.target) {
      tx = a.target.x;
      ty = a.target.y;
      a.tz = a.target.z;
      speed *= 1.9;
      const reach = size * 0.28 + 0.5;
      const mouthX = a.x + a.face * size * 0.35;
      if (Math.hypot(a.target.x - mouthX, a.target.y - a.y) < reach) this.eat(a, a.target);
    } else if (a.mode === 'enter') {
      a.vy *= Math.pow(0.4, dt);
      if (a.vy < 0.6) {
        a.mode = 'wander';
        this.pickTarget(a);
      }
    }

    if (sp.kind === 'jelly') {
      this.updateJelly(a, dt, size);
      return;
    }

    if (a.mode !== 'enter') {
      const dx = tx - a.x;
      const dy = ty - a.y;
      const d = Math.hypot(dx, dy);
      if (a.mode === 'wander' && d < Math.max(0.8, size * 0.4)) {
        a.wait -= dt;
        if (a.wait <= 0) {
          a.wait = rand(0.2, 2.2) / nightSlow;
          this.pickTarget(a);
        }
      }
      const arrive = Math.min(1, d / (size * 1.5 + 1));
      let dvx = d > 0.01 ? (dx / d) * speed * arrive : 0;
      let dvy = d > 0.01 ? (dy / d) * speed * arrive * 0.7 : 0;
      // ayrışma (çarpışmayı azalt)
      for (const o of this.agents.values()) {
        if (o === a || o.walker) continue;
        const ox = a.x - o.x;
        const oy = a.y - o.y;
        const od = Math.hypot(ox, oy);
        const minD = (size + this.sizeOf(o.sp, o.fish)) * 0.35;
        if (od > 0.001 && od < minD && Math.abs(o.z - a.z) < 0.25) {
          dvx += (ox / od) * speed * 0.6;
          dvy += (oy / od) * speed * 0.4;
        }
      }
      const k = Math.min(1, dt * (a.mode === 'food' ? 4 : 2.2));
      a.vx += (dvx - a.vx) * k;
      a.vy += (dvy - a.vy) * k;
    }
    // hafif süzülme
    a.vy += Math.sin(this.time * 1.3 + a.ox * 5) * 0.08 * dt * size;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    const b = swimBounds(g, size, a.z);
    if (a.mode !== 'enter') {
      if (a.x < b.x0) { a.x = b.x0; a.vx = Math.abs(a.vx) * 0.3; }
      if (a.x > b.x1) { a.x = b.x1; a.vx = -Math.abs(a.vx) * 0.3; }
      if (a.y < b.y0) { a.y = b.y0; a.vy = Math.abs(a.vy) * 0.3; }
      if (a.y > b.y1) { a.y = b.y1; a.vy = -Math.abs(a.vy) * 0.3; }
    } else {
      a.x = clamp(a.x, b.x0, b.x1);
    }
    // Yön ve kuyruk
    if (Math.abs(a.vx) > 0.25) a.face = a.vx > 0 ? 1 : -1;
    a.turn += clamp(a.face - a.turn, -dt * 6, dt * 6);
    const sp01 = Math.hypot(a.vx, a.vy) / Math.max(0.5, size);
    a.phase += dt * (4 + sp01 * 9) * (sp.kind === 'seahorse' ? 0.5 : 1);
    if (chance(dt * 0.05)) this.bubble(a.x + a.face * size * 0.45, a.y, a.z, rand(0.12, 0.25));
  }

  private updateJelly(a: Agent, dt: number, size: number) {
    const g = this.geom;
    a.timer -= dt;
    a.pulse = Math.max(0, a.pulse - dt * 1.6);
    if (a.timer <= 0) {
      a.timer = rand(1.8, 3.2);
      a.pulse = 1;
      a.vy -= size * 0.28;
      a.vx += rand(-1, 1) * size * 0.05;
    }
    a.vy += size * 0.03 * dt;
    a.vx *= Math.pow(0.6, dt);
    a.vy *= Math.pow(0.7, dt);
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    const b = swimBounds(g, size, a.z);
    a.x = clamp(a.x, b.x0, b.x1);
    if (a.y < b.y0) { a.y = b.y0; a.vy = 0.5; }
    if (a.y > b.y1) { a.y = b.y1; a.vy = -size * 0.2; }
    a.phase += dt * 2;
  }

  private updateWalker(a: Agent, dt: number, size: number, nightSlow: number) {
    const g = this.geom;
    const sp = a.sp;
    let speed = Math.max(0.35, sp.speed * size * 0.45) * nightSlow;
    if (sp.kind === 'snail') speed = Math.max(0.25, size * 0.08);
    if (sp.kind === 'starfish') speed = 0.12;

    // Kurbağa: nefes turu
    if (sp.kind === 'frog') {
      a.timer -= dt;
      if (a.timer <= 0 && a.mode !== 'breathe' && a.mode !== 'food') {
        a.mode = 'breathe';
        a.timer = 99;
        a.ty = g.surfaceY + size * 0.3;
      }
      if (a.mode === 'breathe') {
        a.walk = 1;
        a.vy += (a.ty - a.y > 0 ? 1 : -1) * dt * 12;
        a.vy = clamp(a.vy, -size * 2, size);
        a.y += a.vy * dt;
        a.phase += dt * 8;
        if (a.y <= a.ty + 0.2) {
          a.mode = 'wander';
          a.timer = rand(35, 70);
          this.bubble(a.x, a.y, a.z, 0.3);
          a.vy = 0;
        }
        return;
      }
      const gy = this.walkY(sp, size, a.z);
      if (a.y < gy - 0.1) {
        a.y = Math.min(gy, a.y + dt * size * 0.5);
        a.phase += dt * 3;
        a.walk = 0.6;
        return;
      }
    }

    if (a.mode === 'enter') {
      const gy = this.walkY(sp, size, a.z);
      a.y += a.vy * dt;
      a.vy = Math.min(6, a.vy + dt * 6);
      if (a.y >= gy) {
        a.y = gy;
        a.mode = 'wander';
        this.pickTarget(a);
      }
      return;
    }

    let tx = a.tx;
    let ty = a.ty;
    if (a.mode === 'food' && a.target) {
      tx = a.target.x;
      a.tz = a.target.z;
      ty = this.walkY(sp, size, a.target.z);
      speed *= 1.6;
      if (Math.abs(a.target.x - a.x) < size * 0.5 + 0.4 && Math.abs(a.target.z - a.z) < 0.25) this.eat(a, a.target);
    }
    if (a.mode === 'glass') {
      // arka camda gezinme
      a.z += clamp(0 - a.z, -dt * 0.3, dt * 0.3);
      const dx = tx - a.x;
      const dy = ty - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.5) {
        a.wait -= dt;
        if (a.wait <= 0) {
          a.wait = rand(1, 5);
          this.pickTarget(a);
        }
      } else {
        a.x += (dx / d) * speed * dt;
        a.y += (dy / d) * speed * dt;
        a.face = dx > 0 ? 1 : -1;
      }
      a.walk = d > 0.5 ? 1 : 0;
      a.phase += dt * 2 * a.walk;
      a.turn += clamp(a.face - a.turn, -dt * 3, dt * 3);
      // Arka camdaki yosunu kemir
      return;
    }
    const dx = tx - a.x;
    const d = Math.abs(dx);
    if (d < 0.4 && a.mode === 'wander') {
      a.walk = Math.max(0, a.walk - dt * 3);
      a.wait -= dt;
      if (a.wait <= 0) {
        a.wait = rand(0.8, 4);
        this.pickTarget(a);
      }
    } else {
      a.walk = Math.min(1, a.walk + dt * 3);
      a.x += Math.sign(dx) * Math.min(d, speed * dt);
      a.face = dx > 0 ? 1 : -1;
    }
    a.z += clamp(a.tz - a.z, -0.12 * dt, 0.12 * dt);
    const gy = this.walkY(sp, size, a.z);
    a.y += (gy - a.y) * Math.min(1, dt * 6);
    if (a.y > gy) a.y = gy;
    a.turn += clamp(a.face - a.turn, -dt * 5, dt * 5);
    a.phase += dt * (2 + a.walk * 6);
    // karides zıplaması
    if (sp.kind === 'shrimp' && chance(dt * 0.03)) a.y -= size * 1.5;
  }

  private updateCorpses(dt: number) {
    for (const c of this.corpses) {
      c.t += dt;
      c.y = Math.max(this.geom.surfaceY + 0.5, c.y - dt * 1.2);
    }
    this.corpses = this.corpses.filter((c) => c.t < 12);
  }

  private updateBubbles(dt: number) {
    const top = this.geom.surfaceY + 0.2;
    for (const b of this.bubbles) {
      b.y += b.vy * dt;
      b.x += Math.sin(this.time * 3 + b.ph) * 0.6 * dt;
    }
    this.bubbles = this.bubbles.filter((b) => b.y > top);
  }

  private updateEmitters(dt: number) {
    const g = this.geom;
    const t = this.tank;
    // Hava taşı
    const air = t.equip.air ?? 0;
    if (air > 0) {
      this.airT += dt * (6 + air * 7);
      while (this.airT > 1) {
        this.airT -= 1;
        const w = 2 + air * 1.5;
        this.bubble(g.W * 0.72 + rand(-w / 2, w / 2), g.subBackY - 0.5, rand(0, 0.15), rand(0.12, 0.35));
      }
    }
    // Sünger filtre borusu
    if ((t.equip.filter ?? 0) === 1 && chance(dt * 5)) this.bubble(g.W - 3.2 + rand(-0.1, 0.1), g.subBackY - 4.5, 0.05, rand(0.15, 0.3));
    // Dekor kabarcıkları
    for (const d of t.decor) {
      const def = getDecor(d.def);
      const em = decorBubbleEmitter(def);
      if (!em) continue;
      const k = depthScale(d.z);
      const bx = d.x + em.dx * k * (d.flip ? -1 : 1);
      const by = groundY(g, d.z) + em.dy * k;
      const key = d.id;
      let tt = (this.emitT.get(key) ?? rand(0, 3)) - dt;
      if (def.art === 'chest') {
        const cyc = (this.time + (parseInt(d.id.slice(1), 36) % 7) * 7) % 9;
        if (cyc > 0.3 && cyc < 1.2 && chance(dt * 25)) this.bubble(bx + rand(-2, 2), by, d.z, rand(0.2, 0.5));
      } else if (tt <= 0) {
        tt = em.rate * rand(0.8, 1.2);
        const n = em.burst ? 14 : 3;
        for (let i = 0; i < n; i++) this.bubble(bx + rand(-0.4, 0.4), by - rand(0, 1), d.z, rand(0.15, em.burst ? 0.55 : 0.35));
      }
      this.emitT.set(key, tt);
    }
    // CO2 difüzörü
    if ((t.equip.co2 ?? 0) > 0 && chance(dt * 3)) this.bubble(4 + rand(0, 1), g.subBackY - 2, 0.05, 0.08);
  }

  private updateLucky(dt: number) {
    for (const l of this.lucky) {
      l.t += dt;
      l.y -= dt * 1.4;
      l.x += Math.sin(l.t * 2) * dt * 0.8;
    }
    const before = this.lucky.length;
    this.lucky = this.lucky.filter((l) => l.y > this.geom.surfaceY + 0.5);
    if (this.lucky.length < before) this.onFx('pop');
  }

  private updateSparks(dt: number) {
    for (const s of this.sparks) {
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.kind === 'algae' || s.kind === 'dirt') s.vy += dt * 6;
      else if (s.kind === 'drop') s.vy += dt * 20;
      else if (s.kind === 'heart') s.vy *= Math.pow(0.8, dt);
      s.vx *= Math.pow(0.5, dt);
    }
    this.sparks = this.sparks.filter((s) => s.t < s.life);
    for (const t of this.texts) {
      t.t += dt;
      t.y -= dt * 2.2;
    }
    this.texts = this.texts.filter((t) => t.t < t.life);
  }

  sitePos(id: string): { x: number; y: number; z: number } | null {
    const d = this.tank.decor.find((x) => x.id === id);
    if (d) {
      const def = getDecor(d.def);
      return { x: d.x, y: groundY(this.geom, d.z) - def.h * depthScale(d.z) * 0.5, z: d.z };
    }
    const p = this.tank.plants.find((x) => x.id === id);
    if (p) {
      const def = getPlant(p.def);
      const y = def.type === 'floating' ? this.geom.surfaceY + 2 : groundY(this.geom, p.z) - def.h * (0.35 + 0.65 * p.g) * 0.5;
      return { x: p.x, y, z: p.z };
    }
    return null;
  }
}
