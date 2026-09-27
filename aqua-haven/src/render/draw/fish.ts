import type { BodyShape, FishLook, PatternDef } from '../../game/types';
import { alpha, mix, shade } from '../color';
import { mulberry32 } from '../../game/util';

// Birim uzayda çizim: balık +x yönüne bakar, burun x=0.5'te, gövde uzunluğu ≈ 1.

interface ShapeP {
  topX: number;
  botX: number;
  top: number;
  bot: number;
  nose: number;
  round: number;
  ped: number;
  pedX: number;
  eyeX: number;
  eyeY: number;
}

const SHAPES: Record<BodyShape, ShapeP> = {
  torpedo: { topX: 0.08, botX: 0.02, top: 1, bot: 0.95, nose: 0.05, round: 0.35, ped: 0.34, pedX: -0.26, eyeX: 0.34, eyeY: -0.18 },
  oval: { topX: 0.06, botX: 0.02, top: 1, bot: 1, nose: 0.1, round: 0.55, ped: 0.3, pedX: -0.25, eyeX: 0.33, eyeY: -0.2 },
  deep: { topX: 0.12, botX: 0.06, top: 1, bot: 1, nose: 0.02, round: 0.28, ped: 0.17, pedX: -0.22, eyeX: 0.32, eyeY: -0.16 },
  disc: { topX: 0.06, botX: 0.06, top: 1, bot: 1, nose: 0.08, round: 0.85, ped: 0.13, pedX: -0.3, eyeX: 0.3, eyeY: -0.18 },
  round: { topX: 0.06, botX: 0.0, top: 1, bot: 1.05, nose: 0.12, round: 0.95, ped: 0.2, pedX: -0.24, eyeX: 0.33, eyeY: -0.12 },
  long: { topX: -0.04, botX: 0.0, top: 0.9, bot: 1, nose: -0.3, round: 0.2, ped: 0.45, pedX: -0.3, eyeX: 0.36, eyeY: -0.2 },
  betta: { topX: 0.04, botX: 0.0, top: 0.95, bot: 1, nose: -0.12, round: 0.4, ped: 0.42, pedX: -0.22, eyeX: 0.35, eyeY: -0.18 },
  arowana: { topX: -0.05, botX: 0.02, top: 0.8, bot: 1, nose: -0.55, round: 0.12, ped: 0.45, pedX: -0.3, eyeX: 0.37, eyeY: -0.36 },
  cory: { topX: 0.12, botX: 0.0, top: 1.15, bot: 0.62, nose: 0.38, round: 0.7, ped: 0.35, pedX: -0.24, eyeX: 0.3, eyeY: -0.28 },
  pleco: { topX: 0.2, botX: 0.1, top: 1, bot: 0.45, nose: 0.3, round: 0.8, ped: 0.32, pedX: -0.26, eyeX: 0.28, eyeY: -0.45 },
  tang: { topX: 0.05, botX: 0.05, top: 1, bot: 1, nose: -0.08, round: 0.14, ped: 0.17, pedX: -0.24, eyeX: 0.3, eyeY: -0.22 },
  puffer: { topX: 0.1, botX: 0.1, top: 1, bot: 1, nose: 0.05, round: 1, ped: 0.24, pedX: -0.22, eyeX: 0.3, eyeY: -0.25 },
  lion: { topX: 0.1, botX: 0.04, top: 1, bot: 0.95, nose: 0.02, round: 0.45, ped: 0.3, pedX: -0.24, eyeX: 0.34, eyeY: -0.22 },
  mandarin: { topX: 0.2, botX: 0.08, top: 1, bot: 0.8, nose: 0.12, round: 0.8, ped: 0.3, pedX: -0.24, eyeX: 0.31, eyeY: -0.3 },
};

export interface FishAssets {
  look: FishLook;
  sh: ShapeP;
  hh: number; // yarım yükseklik
  body: Path2D;
  top: number[]; // örneklenmiş üst kenar y (x = -0.3..0.5)
  bot: number[];
  pedY: number; // kuyruk sapı yarım yükseklik
  tail: Path2D;
  tailRays: Path2D;
  dorsal: Path2D | null;
  dorsalRays: Path2D | null;
  anal: Path2D | null;
  pelvic: Path2D | null;
  pectoral: Path2D;
  finGrad: CanvasGradient | null;
  tailGrad: CanvasGradient | null;
  eye: { x: number; y: number; r: number };
  box: { x: number; y: number; w: number; h: number }; // sprite kutusu (birim)
}

const SAMPLES = 41;
const SX0 = -0.32;
const SX1 = 0.5;

function sampleIndex(x: number) {
  return Math.max(0, Math.min(SAMPLES - 1, Math.round(((x - SX0) / (SX1 - SX0)) * (SAMPLES - 1))));
}

export function edgeY(a: FishAssets, x: number, which: 'top' | 'bot') {
  return (which === 'top' ? a.top : a.bot)[sampleIndex(x)];
}

// Bezier örnekleme yardımcıları
type P = [number, number];
function bez(p0: P, p1: P, p2: P, p3: P, t: number): P {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function buildBody(look: FishLook, sh: ShapeP, hh: number) {
  const nose: P = [0.5, sh.nose * hh];
  const px = sh.pedX;
  const pt = -sh.ped * hh;
  const pb = sh.ped * hh;
  const topMax: P = [sh.topX, -hh * sh.top];
  const botMax: P = [sh.botX, hh * sh.bot];
  const hump = look.hump ?? 0;
  const segs: [P, P, P, P][] = [
    [nose, [0.5 - 0.02, nose[1] - hh * 0.55 * sh.round - hh * 0.22 - hump * 0.5], [topMax[0] + 0.22, topMax[1] - hump * 0.6], topMax],
    [topMax, [topMax[0] - 0.28, topMax[1]], [px + 0.14, pt - hh * 0.05], [px, pt]],
    [[px, pb], [px + 0.16, pb + hh * 0.08], [botMax[0] - 0.25, botMax[1]], botMax],
    [botMax, [botMax[0] + 0.24, botMax[1]], [0.5 - 0.02, nose[1] + hh * 0.5 * sh.round + hh * 0.18], nose],
  ];
  const body = new Path2D();
  body.moveTo(nose[0], nose[1]);
  body.bezierCurveTo(...segs[0][1], ...segs[0][2], ...segs[0][3]);
  body.bezierCurveTo(...segs[1][1], ...segs[1][2], ...segs[1][3]);
  body.lineTo(px, pb);
  body.bezierCurveTo(...segs[2][1], ...segs[2][2], ...segs[2][3]);
  body.bezierCurveTo(...segs[3][1], ...segs[3][2], ...segs[3][3]);
  body.closePath();

  // Kenarları örnekle
  const topPts: P[] = [];
  const botPts: P[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    topPts.push(bez(...segs[0], t));
    topPts.push(bez(...segs[1], t));
    botPts.push(bez(...segs[2], t));
    botPts.push(bez(...segs[3], t));
  }
  const sample = (pts: P[], def: number) => {
    const out: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const x = SX0 + ((SX1 - SX0) * i) / (SAMPLES - 1);
      let best = def;
      let bd = Infinity;
      for (const p of pts) {
        const d = Math.abs(p[0] - x);
        if (d < bd) {
          bd = d;
          best = p[1];
        }
      }
      out.push(x < px ? (def < 0 ? pt : pb) : best);
    }
    return out;
  };
  return { body, top: sample(topPts, -1), bot: sample(botPts, 1), pedY: pb };
}

function buildTail(look: FishLook, sh: ShapeP, pedY: number) {
  const s = look.tailSize;
  const x0 = sh.pedX + 0.01;
  const L = 0.3 * s;
  const T = Math.max(pedY * 1.4, 0.2 * s + pedY * 0.6);
  const p = new Path2D();
  const rays = new Path2D();
  const xe = x0 - L;
  switch (look.tail) {
    case 'fork':
      p.moveTo(x0, -pedY);
      p.quadraticCurveTo(x0 - L * 0.5, -T * 0.7, xe, -T);
      p.quadraticCurveTo(x0 - L * 0.55, -T * 0.25, x0 - L * 0.42, 0);
      p.quadraticCurveTo(x0 - L * 0.55, T * 0.25, xe, T);
      p.quadraticCurveTo(x0 - L * 0.5, T * 0.7, x0, pedY);
      break;
    case 'crescent':
      p.moveTo(x0, -pedY);
      p.quadraticCurveTo(x0 - L * 0.55, -T * 0.6, xe - L * 0.1, -T * 1.05);
      p.quadraticCurveTo(x0 - L * 0.35, 0, xe - L * 0.1, T * 1.05);
      p.quadraticCurveTo(x0 - L * 0.55, T * 0.6, x0, pedY);
      break;
    case 'lyre':
      p.moveTo(x0, -pedY);
      p.quadraticCurveTo(x0 - L * 0.6, -T * 0.6, xe - L * 0.7, -T * 1.2);
      p.quadraticCurveTo(x0 - L * 0.6, -T * 0.45, x0 - L * 0.5, 0);
      p.quadraticCurveTo(x0 - L * 0.6, T * 0.45, xe - L * 0.7, T * 1.2);
      p.quadraticCurveTo(x0 - L * 0.6, T * 0.6, x0, pedY);
      break;
    case 'round':
      p.moveTo(x0, -pedY);
      p.quadraticCurveTo(x0 - L * 0.3, -T * 0.95, x0 - L * 0.75, -T * 0.85);
      p.quadraticCurveTo(xe - L * 0.12, 0, x0 - L * 0.75, T * 0.85);
      p.quadraticCurveTo(x0 - L * 0.3, T * 0.95, x0, pedY);
      break;
    case 'veil':
      p.moveTo(x0, -pedY);
      p.bezierCurveTo(x0 - L * 0.3, -T * 1.0, xe, -T * 0.9, xe - L * 0.08, -T * 0.2);
      p.bezierCurveTo(xe - L * 0.05, T * 0.5, x0 - L * 0.7, T * 1.35, x0 - L * 0.35, T * 1.1);
      p.quadraticCurveTo(x0 - L * 0.12, T * 0.55, x0, pedY);
      break;
    case 'split':
      p.moveTo(x0, -pedY);
      p.bezierCurveTo(x0 - L * 0.4, -T * 1.1, xe - L * 0.05, -T * 1.0, xe, -T * 0.55);
      p.quadraticCurveTo(x0 - L * 0.55, -T * 0.15, x0 - L * 0.5, 0);
      p.quadraticCurveTo(x0 - L * 0.55, T * 0.15, xe, T * 0.55);
      p.bezierCurveTo(xe - L * 0.05, T * 1.0, x0 - L * 0.4, T * 1.1, x0, pedY);
      break;
    case 'sword':
      p.moveTo(x0, -pedY);
      p.quadraticCurveTo(x0 - L * 0.4, -T * 0.9, xe, -T * 0.7);
      p.quadraticCurveTo(xe + L * 0.1, T * 0.1, xe - L * 0.9, T * 0.9);
      p.quadraticCurveTo(x0 - L * 0.4, T * 0.8, x0, pedY);
      break;
    case 'fan':
    default:
      p.moveTo(x0, -pedY);
      p.quadraticCurveTo(x0 - L * 0.5, -T * 0.8, xe, -T);
      p.quadraticCurveTo(xe - L * 0.12, 0, xe, T);
      p.quadraticCurveTo(x0 - L * 0.5, T * 0.8, x0, pedY);
      break;
  }
  p.closePath();
  const n = look.tail === 'veil' ? 9 : 7;
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * 2 - 1;
    rays.moveTo(x0, a * pedY * 0.6);
    const ex = look.tail === 'veil' ? xe + L * 0.1 * Math.abs(a) - (a > 0 ? L * 0.1 : 0) : xe + L * 0.18 * (1 - Math.abs(a));
    const ey = a * T * (look.tail === 'veil' && a > 0 ? 1.15 : 0.9);
    rays.quadraticCurveTo(x0 - L * 0.45, a * T * 0.5, ex, ey);
  }
  return { tail: p, rays, T, L };
}

function buildDorsal(look: FishLook, a: { top: number[]; bot: number[] }, sh: ShapeP, hh: number) {
  if (look.dorsal === 'none' || look.dorsalSize <= 0) return { dorsal: null, rays: null };
  const s = look.dorsalSize;
  const p = new Path2D();
  const rays = new Path2D();
  const ty = (x: number) => a.top[sampleIndex(x)] + 0.004;
  let x0: number;
  let x1: number;
  let peakX: number;
  let peakH: number;
  let backX: number;
  switch (look.dorsal) {
    case 'small':
      x0 = sh.topX + 0.1; x1 = sh.topX - 0.18; peakX = x0 - 0.05; peakH = 0.16 * s; backX = x1 - 0.04; break;
    case 'tall':
      x0 = sh.topX + 0.12; x1 = sh.topX - 0.14; peakX = x0 - 0.03; peakH = 0.26 * s; backX = x1 - 0.06; break;
    case 'long':
      x0 = sh.topX + 0.05; x1 = sh.pedX + 0.04; peakX = sh.pedX + 0.08; peakH = 0.2 * s; backX = sh.pedX - 0.18 * s; break;
    case 'sail':
      x0 = sh.topX + 0.15; x1 = sh.pedX + 0.08; peakX = sh.pedX + 0.02; peakH = 0.36 * s; backX = sh.pedX - 0.12 * s; break;
    case 'spiky':
      x0 = sh.topX + 0.22; x1 = sh.pedX + 0.04; peakX = sh.topX; peakH = 0.4 * s; backX = sh.pedX - 0.02; break;
  }
  const y0 = ty(x0);
  const y1 = ty(x1);
  if (look.dorsal === 'spiky') {
    const n = 9;
    p.moveTo(x0, y0);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const bx = x0 + (x1 - x0) * t;
      const h = peakH * (1 - Math.abs(t - 0.3) * 0.9);
      p.lineTo(bx + 0.03, ty(bx) - h);
      p.lineTo(bx + (x1 - x0) / n * 0.5, ty(bx) - h * 0.35);
      rays.moveTo(bx, ty(bx));
      rays.lineTo(bx + 0.03, ty(bx) - h);
    }
    p.lineTo(x1, y1);
    p.closePath();
    return { dorsal: p, rays };
  }
  p.moveTo(x0, y0);
  p.quadraticCurveTo(x0 - 0.01, y0 - peakH * 0.9, peakX, Math.min(y0, y1) - peakH);
  p.quadraticCurveTo(backX + 0.02, Math.min(y0, y1) - peakH * 0.55, backX, y1 - peakH * 0.15);
  p.quadraticCurveTo(x1 + 0.01, y1 - peakH * 0.1, x1, y1);
  p.closePath();
  const n = 6;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const bx = x0 + (x1 - x0) * t;
    rays.moveTo(bx, ty(bx));
    rays.lineTo(bx + (backX - x0) * 0.25 * t - 0.02, ty(bx) - peakH * (0.95 - t * 0.4));
  }
  void hh;
  return { dorsal: p, rays };
}

function buildAnal(look: FishLook, a: { top: number[]; bot: number[] }, sh: ShapeP) {
  if (look.anal === 'none') return null;
  const s = look.analSize ?? (look.anal === 'small' ? 0.4 : 0.6);
  const by = (x: number) => a.bot[sampleIndex(x)] - 0.004;
  const p = new Path2D();
  let x0: number;
  let x1: number;
  let h: number;
  let back: number;
  switch (look.anal) {
    case 'long':
      x0 = sh.botX - 0.02; x1 = sh.pedX + 0.03; h = 0.22 * s; back = sh.pedX - 0.2 * s; break;
    case 'tall':
      x0 = sh.botX + 0.02; x1 = sh.pedX + 0.08; h = 0.34 * s; back = sh.pedX - 0.08 * s; break;
    default:
      x0 = sh.pedX + 0.2; x1 = sh.pedX + 0.05; h = 0.14 * s + 0.03; back = x1 - 0.03; break;
  }
  const y0 = by(x0);
  const y1 = by(x1);
  p.moveTo(x0, y0);
  p.quadraticCurveTo(x0 - 0.02, y0 + h * 0.9, (x0 + back) / 2, Math.max(y0, y1) + h);
  p.quadraticCurveTo(back, Math.max(y0, y1) + h * 0.6, back, y1 + h * 0.2);
  p.quadraticCurveTo(x1, y1 + h * 0.1, x1, y1);
  p.closePath();
  return p;
}

function buildPelvic(look: FishLook, a: { top: number[]; bot: number[] }, sh: ShapeP) {
  const kind = look.pelvic ?? 'small';
  if (kind === 'none') return null;
  const x0 = sh.eyeX - 0.06;
  const y0 = a.bot[sampleIndex(x0)] - 0.01;
  const p = new Path2D();
  if (kind === 'thread') {
    p.moveTo(x0, y0);
    p.quadraticCurveTo(x0 - 0.08, y0 + 0.15, x0 - 0.22, y0 + 0.42);
    p.quadraticCurveTo(x0 - 0.06, y0 + 0.12, x0 + 0.03, y0);
  } else if (kind === 'long') {
    p.moveTo(x0, y0);
    p.quadraticCurveTo(x0 - 0.06, y0 + 0.14, x0 - 0.16, y0 + 0.24);
    p.quadraticCurveTo(x0 - 0.06, y0 + 0.06, x0 + 0.04, y0);
  } else {
    p.moveTo(x0, y0);
    p.quadraticCurveTo(x0 - 0.04, y0 + 0.08, x0 - 0.1, y0 + 0.1);
    p.quadraticCurveTo(x0 - 0.04, y0 + 0.03, x0 + 0.04, y0);
  }
  p.closePath();
  return p;
}

function buildPectoral(sh: ShapeP, hh: number, big: boolean) {
  const p = new Path2D();
  const x0 = sh.eyeX - 0.1;
  const y0 = hh * 0.15;
  const L = big ? 0.42 : 0.14;
  p.moveTo(x0, y0 - 0.02);
  p.quadraticCurveTo(x0 - L * 0.5, y0 - 0.02 - (big ? 0.2 : 0.03), x0 - L, y0 + (big ? 0.12 : 0.04));
  p.quadraticCurveTo(x0 - L * 0.5, y0 + (big ? 0.3 : 0.06), x0, y0 + 0.03);
  p.closePath();
  return p;
}

// Gradyanlar bağlama özgü olabileceğinden önbellek bağlam başınadır
const assetCaches = new WeakMap<CanvasRenderingContext2D, Map<string, FishAssets>>();

/** Tür/varyant/evre görünümü için geometri ve renk varlıklarını üretir (önbellekli) */
export function fishAssets(ctx: CanvasRenderingContext2D, key: string, look: FishLook): FishAssets {
  let assetCache = assetCaches.get(ctx);
  if (!assetCache) {
    assetCache = new Map();
    assetCaches.set(ctx, assetCache);
  }
  const hit = assetCache.get(key);
  if (hit) return hit;
  const sh = SHAPES[look.body] ?? SHAPES.oval;
  const hh = look.h / 2;
  const b = buildBody(look, sh, hh);
  const t = buildTail(look, sh, b.pedY);
  const d = buildDorsal(look, b, sh, hh);
  const eyeR = 0.045 * (look.eye ?? 1);
  const eye = { x: sh.eyeX, y: sh.eyeY * hh * 2 * 0.5 + (look.body === 'arowana' ? 0 : 0), r: eyeR };
  eye.y = sh.eyeY * hh;
  let finGrad: CanvasGradient | null = null;
  let tailGrad: CanvasGradient | null = null;
  const edge = look.finEdge ?? shade(look.fin, 0.25);
  finGrad = ctx.createLinearGradient(0, -hh, 0, -hh - 0.4);
  finGrad.addColorStop(0, look.fin);
  finGrad.addColorStop(1, edge);
  tailGrad = ctx.createLinearGradient(sh.pedX, 0, sh.pedX - t.L * 1.1, 0);
  const tailBase = look.tailColor ?? look.fin;
  tailGrad.addColorStop(0, tailBase);
  tailGrad.addColorStop(0.65, tailBase);
  tailGrad.addColorStop(1, look.tailColor ? shade(look.tailColor, 0.2) : edge);
  const yMin = Math.min(-hh * 1.2 - (look.hump ?? 0) * 0.7, -0.12);
  const assets: FishAssets = {
    look,
    sh,
    hh,
    body: b.body,
    top: b.top,
    bot: b.bot,
    pedY: b.pedY,
    tail: t.tail,
    tailRays: t.rays,
    dorsal: d.dorsal,
    dorsalRays: d.rays,
    anal: buildAnal(look, b, sh),
    pelvic: buildPelvic(look, b, sh),
    pectoral: buildPectoral(sh, hh, look.body === 'lion'),
    finGrad,
    tailGrad,
    eye,
    box: { x: sh.pedX - 0.06, y: yMin - 0.04, w: 0.5 - sh.pedX + 0.12, h: hh * 1.1 - yMin + 0.12 },
  };
  assetCache.set(key, assets);
  return assets;
}

// ------------------------------------------------------------------ desenler

function drawPattern(ctx: CanvasRenderingContext2D, a: FishAssets, p: PatternDef, seed: number, fade: number) {
  const { hh, sh } = a;
  const rng = mulberry32(seed + p.type.length * 977);
  const alphaK = (p.a ?? 1) * fade;
  ctx.globalAlpha = alphaK;
  const x0 = sh.pedX - 0.02;
  const x1 = 0.5;
  switch (p.type) {
    case 'stripesV': {
      const n = p.n ?? 3;
      const w = p.w ?? 0.06;
      ctx.fillStyle = p.color;
      for (let i = 0; i < n; i++) {
        const cx = sh.eyeX - 0.02 - ((sh.eyeX + 0.12 - sh.pedX) * i) / Math.max(1, n - 1 + 0.4);
        ctx.beginPath();
        ctx.moveTo(cx + w / 2 + 0.02, -hh * 1.3);
        ctx.quadraticCurveTo(cx + w / 2 - 0.03, 0, cx + w / 2 + 0.01, hh * 1.3);
        ctx.lineTo(cx - w / 2 + 0.01, hh * 1.3);
        ctx.quadraticCurveTo(cx - w / 2 - 0.03, 0, cx - w / 2 + 0.02, -hh * 1.3);
        ctx.fill();
      }
      break;
    }
    case 'stripesH': {
      const n = p.n ?? 3;
      const w = p.w ?? 0.04;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const y = -hh * 0.75 + ((hh * 1.5) * (i + 0.5)) / n;
        ctx.beginPath();
        ctx.moveTo(x1 - 0.08, y * 0.8);
        ctx.quadraticCurveTo(0.1, y * 1.05 - 0.01, x0, y * 0.5);
        ctx.stroke();
      }
      break;
    }
    case 'neon': {
      const y = -hh * 0.12;
      ctx.lineCap = 'round';
      ctx.strokeStyle = alpha(p.color, 0.35);
      ctx.lineWidth = hh * 0.42;
      ctx.beginPath();
      ctx.moveTo(sh.eyeX - 0.02, y);
      ctx.lineTo(sh.pedX + 0.06, y + 0.01);
      ctx.stroke();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = hh * 0.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = hh * 0.05;
      ctx.stroke();
      break;
    }
    case 'rearColor':
    case 'frontColor': {
      const w = p.w ?? 0.5;
      const rear = p.type === 'rearColor';
      const xa = rear ? x0 - 0.1 : x1 + 0.05;
      const xb = rear ? x0 + (x1 - x0) * w : x1 - (x1 - x0) * w;
      const g = ctx.createLinearGradient(xa, 0, xb, 0);
      g.addColorStop(0, p.color);
      g.addColorStop(0.75, p.color);
      g.addColorStop(1, alpha(p.color, 0));
      ctx.fillStyle = g;
      const yTop = p.part === 'lower' ? -hh * 0.02 : -hh * 1.4;
      const yBot = p.part === 'upper' ? hh * 0.02 : hh * 1.4;
      ctx.fillRect(Math.min(xa, xb), yTop, Math.abs(xb - xa), yBot - yTop);
      break;
    }
    case 'spots':
    case 'dots': {
      const n = p.n ?? 12;
      ctx.fillStyle = p.color;
      const big = p.type === 'spots';
      for (let i = 0; i < n; i++) {
        const x = x0 + 0.04 + rng() * (x1 - x0 - 0.1);
        const y = (rng() * 2 - 1) * hh * 0.9;
        const r = (big ? 0.022 + rng() * 0.02 : 0.009 + rng() * 0.008) * (0.7 + hh);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'patches':
    case 'marble': {
      const n = p.n ?? (p.type === 'marble' ? 7 : 3);
      ctx.fillStyle = p.color;
      for (let i = 0; i < n; i++) {
        const cx = x0 + 0.06 + rng() * (x1 - x0 - 0.12);
        const cy = (rng() * 2 - 1) * hh * 0.7;
        const r = (p.type === 'marble' ? 0.05 : 0.08) + rng() * 0.08;
        ctx.beginPath();
        const k = 7;
        for (let j = 0; j <= k; j++) {
          const ang = (j / k) * Math.PI * 2;
          const rr = r * (0.6 + rng() * 0.6);
          const px = cx + Math.cos(ang) * rr * 1.3;
          const py = cy + Math.sin(ang) * rr * 0.8;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.quadraticCurveTo(cx + Math.cos(ang - 0.4) * rr * 1.5, cy + Math.sin(ang - 0.4) * rr, px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'mask': {
      ctx.fillStyle = p.color;
      const cx = a.eye.x;
      ctx.beginPath();
      ctx.ellipse(cx, 0, 0.045, hh * 1.3, 0.05, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bands': {
      const n = p.n ?? 3;
      const xs = n === 3 ? [sh.eyeX - 0.06, 0.02, sh.pedX + 0.04] : Array.from({ length: n }, (_, i) => sh.eyeX - 0.06 - (i * (sh.eyeX - sh.pedX - 0.02)) / (n - 1));
      xs.forEach((cx, i) => {
        const w = (i === 1 ? 0.075 : 0.06) * (n > 3 ? 0.7 : 1);
        ctx.fillStyle = p.color2 ?? '#111';
        ctx.beginPath();
        ctx.ellipse(cx, 0, w + 0.018, hh * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(cx, 0, w, hh * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'waves': {
      const n = p.n ?? 6;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.w ?? 0.018;
      for (let i = 0; i < n; i++) {
        const y = -hh * 0.85 + (hh * 1.7 * (i + 0.5)) / n;
        ctx.beginPath();
        for (let k = 0; k <= 16; k++) {
          const x = x1 - (k / 16) * (x1 - x0);
          const yy = y + Math.sin(k * 1.3 + i * 1.7 + rng() * 0.3) * hh * 0.07;
          if (k === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      break;
    }
    case 'scales': {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 0.008;
      const r = 0.035;
      for (let y = -hh; y < hh; y += r * 1.1) {
        const off = (Math.round(y / r) % 2) * r * 0.5;
        for (let x = x0 + 0.03 + off; x < sh.eyeX - 0.08; x += r * 1.05) {
          ctx.beginPath();
          ctx.arc(x, y, r * 0.6, Math.PI * 0.5, Math.PI * 1.5);
          ctx.stroke();
        }
      }
      break;
    }
    case 'tailSpot': {
      const cx = sh.pedX + 0.04;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(cx, -0.01, a.pedY * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(cx, -0.01, a.pedY * 0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lionStripes': {
      const n = p.n ?? 10;
      ctx.fillStyle = p.color;
      for (let i = 0; i < n; i++) {
        const cx = x1 - 0.05 - ((x1 - x0) * (i + 0.5)) / n;
        ctx.beginPath();
        ctx.ellipse(cx, 0, 0.015, hh * 1.3, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'palette': {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(sh.eyeX + 0.02, -hh * 0.35);
      ctx.bezierCurveTo(0.1, -hh * 0.9, -0.15, -hh * 0.3, sh.pedX + 0.02, -hh * 0.35);
      ctx.lineTo(sh.pedX + 0.02, hh * 0.1);
      ctx.bezierCurveTo(-0.05, -hh * 0.05, 0.05, hh * 0.35, -0.02, hh * 0.1);
      ctx.bezierCurveTo(0.12, -hh * 0.15, 0.25, hh * 0.05, sh.eyeX + 0.02, hh * 0.05);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'lateral': {
      ctx.strokeStyle = p.color;
      ctx.lineCap = 'round';
      ctx.lineWidth = p.w ?? 0.03;
      ctx.setLineDash([0.05, 0.03]);
      ctx.beginPath();
      ctx.moveTo(sh.eyeX - 0.05, 0);
      ctx.lineTo(sh.pedX + 0.04, 0.005);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'dorsalSpot':
      break; // yüzgeç çiziminde ele alınır
  }
  ctx.globalAlpha = 1;
}

/** Gövdeyi (desen, gölge, göz dahil) çizer — sprite'a bir kez işlenir */
export function drawBody(
  ctx: CanvasRenderingContext2D,
  a: FishAssets,
  seed: number,
  stage: number,
  sick = false,
  pxPerUnit = 100,
) {
  const { look, hh, body } = a;
  const pale = stage === 0 ? 0.18 : 0;
  const c1 = pale ? mix(look.c1, look.c2, pale) : look.c1;
  const c2 = look.c2;
  // Işıltı (shadowBlur piksel cinsindendir, dönüşümden etkilenmez)
  if (look.glow) {
    ctx.save();
    ctx.shadowColor = look.glow;
    ctx.shadowBlur = Math.max(4, pxPerUnit * 0.12);
    ctx.fillStyle = look.glow;
    ctx.fill(body);
    ctx.fill(body);
    ctx.restore();
  }
  const g = ctx.createLinearGradient(0, -hh * 1.1, 0, hh * 1.1);
  g.addColorStop(0, shade(c1, -0.22));
  g.addColorStop(0.42, c1);
  g.addColorStop(0.72, mix(c1, c2, 0.7));
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fill(body);

  ctx.save();
  ctx.clip(body);
  for (const p of look.pattern ?? []) drawPattern(ctx, a, p, seed, stage === 0 ? 0.6 : 1);
  // Hacim gölgesi
  const sg = ctx.createLinearGradient(0, -hh, 0, hh);
  sg.addColorStop(0, 'rgba(0,10,30,0.22)');
  sg.addColorStop(0.35, 'rgba(0,10,30,0)');
  sg.addColorStop(0.8, 'rgba(0,10,30,0)');
  sg.addColorStop(1, 'rgba(0,10,30,0.16)');
  ctx.fillStyle = sg;
  ctx.fillRect(-0.6, -hh * 1.6, 1.2, hh * 3.2);
  // Parlaklık
  const shine = look.shine ?? 0.3;
  const hg = ctx.createRadialGradient(0.12, -hh * 0.45, 0, 0.12, -hh * 0.45, 0.32);
  hg.addColorStop(0, `rgba(255,255,255,${0.35 * shine + 0.08})`);
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(-0.3, -hh * 1.5, 0.8, hh * 1.6);
  // Solungaç çizgisi
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  const gx = a.eye.x - 0.07 - (look.body === 'disc' ? 0.02 : 0);
  ctx.moveTo(gx + 0.01, -hh * 0.55);
  ctx.quadraticCurveTo(gx - 0.045, 0, gx + 0.01, hh * 0.6);
  ctx.stroke();
  if (sick) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const rng = mulberry32(seed ^ 0x5a5a);
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.arc(a.sh.pedX + rng() * (0.7 - a.sh.pedX), (rng() * 2 - 1) * hh * 0.8, 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Dış hat
  ctx.strokeStyle = alpha(shade(look.c1, -0.5), 0.55);
  ctx.lineWidth = 0.012;
  ctx.stroke(body);

  // Ağız / dudak
  const nose = a.sh.nose * hh;
  ctx.strokeStyle = look.lips ?? alpha(shade(look.c1, -0.55), 0.7);
  ctx.lineWidth = look.lips ? 0.02 : 0.011;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.5, nose + 0.004);
  ctx.quadraticCurveTo(0.47, nose + 0.02, 0.44, nose + 0.018);
  ctx.stroke();

  // Bıyıklar
  if (look.barbels) {
    ctx.strokeStyle = alpha(shade(look.c2, -0.35), 0.8);
    ctx.lineWidth = 0.01;
    ctx.beginPath();
    ctx.moveTo(0.48, nose + 0.02);
    ctx.quadraticCurveTo(0.55, nose + 0.06, 0.53, nose + 0.1);
    ctx.moveTo(0.46, nose + 0.025);
    ctx.quadraticCurveTo(0.5, nose + 0.08, 0.47, nose + 0.12);
    ctx.stroke();
  }

  // Göz
  const e = a.eye;
  const er = e.r * (stage === 0 ? 1.35 : stage === 1 ? 1.15 : 1);
  ctx.fillStyle = look.eyeColor ?? '#f4efe0';
  ctx.beginPath();
  ctx.arc(e.x, e.y, er, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0d12';
  ctx.beginPath();
  ctx.arc(e.x + er * 0.12, e.y + er * 0.05, er * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(e.x + er * 0.32, e.y - er * 0.28, er * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.006;
  ctx.beginPath();
  ctx.arc(e.x, e.y, er, 0, Math.PI * 2);
  ctx.stroke();
}

/** Yüzgeçleri çizer (her karede, animasyonlu) */
export function drawFins(
  ctx: CanvasRenderingContext2D,
  a: FishAssets,
  phase: number,
  layer: 'back' | 'front',
  stage: number,
  flap = 1,
) {
  const { look } = a;
  const finScale = stage === 0 ? 0.72 : stage === 1 ? 0.88 : 1;
  const edgeC = look.finEdge ?? shade(look.fin, 0.2);
  if (layer === 'back') {
    // Kuyruk
    ctx.save();
    const px = a.sh.pedX;
    ctx.translate(px, 0);
    const sw = Math.sin(phase);
    ctx.scale((0.74 + 0.26 * Math.cos(phase)) * finScale, finScale);
    ctx.rotate(sw * 0.07 * flap);
    if (look.tail === 'veil') ctx.transform(1, sw * 0.08, 0, 1, 0, 0);
    ctx.translate(-px, 0);
    ctx.fillStyle = a.tailGrad ?? look.fin;
    ctx.fill(a.tail);
    ctx.strokeStyle = alpha(shade(look.tailColor ?? look.fin, -0.45), 0.35);
    ctx.lineWidth = 0.006;
    ctx.stroke(a.tailRays);
    ctx.strokeStyle = alpha(edgeC, 0.6);
    ctx.lineWidth = 0.008;
    ctx.stroke(a.tail);
    ctx.restore();

    // Sırt yüzgeci
    if (a.dorsal) {
      ctx.save();
      ctx.transform(1, 0, Math.sin(phase * 0.5) * 0.06, 1, 0, 0);
      if (finScale !== 1) {
        ctx.translate(a.sh.topX, -a.hh);
        ctx.scale(1, finScale);
        ctx.translate(-a.sh.topX, a.hh);
      }
      ctx.fillStyle = look.dorsal === 'spiky' ? alpha(look.fin, 0.8) : look.fin;
      ctx.fill(a.dorsal);
      if (a.dorsalRays) {
        ctx.strokeStyle = look.dorsal === 'spiky' ? alpha(look.c1, 0.9) : alpha(shade(look.fin, -0.45), 0.3);
        ctx.lineWidth = look.dorsal === 'spiky' ? 0.012 : 0.006;
        ctx.stroke(a.dorsalRays);
      }
      if (look.pattern?.some((p) => p.type === 'dorsalSpot')) {
        const p = look.pattern.find((q) => q.type === 'dorsalSpot')!;
        ctx.save();
        ctx.clip(a.dorsal);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(a.sh.topX + 0.08, -a.hh * 1.05, 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = alpha(edgeC, 0.55);
      ctx.lineWidth = 0.007;
      ctx.stroke(a.dorsal);
      ctx.restore();
    }
    if (a.anal) {
      ctx.save();
      ctx.transform(1, 0, -Math.sin(phase * 0.5 + 1) * 0.06, 1, 0, 0);
      ctx.fillStyle = look.fin;
      ctx.fill(a.anal);
      ctx.strokeStyle = alpha(edgeC, 0.5);
      ctx.lineWidth = 0.007;
      ctx.stroke(a.anal);
      ctx.restore();
    }
    if (a.pelvic) {
      ctx.save();
      ctx.fillStyle = alpha(look.fin, 0.9);
      ctx.fill(a.pelvic);
      ctx.restore();
    }
    return;
  }
  // Ön katman: göğüs yüzgeci
  ctx.save();
  const ex = a.sh.eyeX - 0.1;
  ctx.translate(ex, a.hh * 0.15);
  const big = look.body === 'lion';
  ctx.scale(0.55 + 0.45 * Math.abs(Math.sin(phase * (big ? 0.4 : 1.6))), 1);
  ctx.translate(-ex, -a.hh * 0.15);
  ctx.fillStyle = big ? alpha(look.fin, 0.85) : alpha(look.fin, 0.55);
  ctx.fill(a.pectoral);
  if (big) {
    ctx.strokeStyle = alpha(look.c2, 0.9);
    ctx.lineWidth = 0.01;
    ctx.stroke(a.pectoral);
  }
  ctx.restore();
}
