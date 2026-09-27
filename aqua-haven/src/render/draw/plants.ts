import type { PlantDef } from '../../game/types';
import { alpha, mix, shade } from '../color';
import { hashString, mulberry32 } from '../../game/util';

// Bitkiler dünya biriminde, taban noktasına göre çizilir (y yukarı negatif).

interface Leaf {
  x: number; // taban x (bitki merkezine göre)
  y: number; // taban y
  len: number;
  ang: number; // radyan, -PI/2 = yukarı
  w: number;
  bend: number; // doğal eğrilik
  c: string;
  c2: string;
  h: number; // yükseklik oranı (salınım için)
  kind: number;
}

export interface PlantShape {
  key: string;
  leaves: Leaf[];
  extra: number[]; // türe özgü ek veriler
  colors: { c1: string; c2: string; c3: string };
}

const shapeCache = new Map<string, PlantShape>();

function fogColor(c: string, fog: number, water: string) {
  return fog > 0.01 ? mix(c, water, fog) : c;
}

export function plantShape(id: string, def: PlantDef, g: number, fog: number, water: string): PlantShape {
  const gb = Math.round(g * 20) / 20;
  const key = `${id}|${gb}|${Math.round(fog * 20)}|${water}`;
  const hit = shapeCache.get(`${id}`);
  if (hit && hit.key === key) return hit;
  const rng = mulberry32(hashString(id));
  const size = 0.35 + 0.65 * gb;
  const W = def.w * size;
  const H = def.h * (def.type === 'floating' ? 1 : size);
  const c1 = fogColor(def.c1, fog, water);
  const c2 = fogColor(def.c2, fog, water);
  const c3 = fogColor(def.c3 ?? shade(def.c2, 0.3), fog, water);
  const leaves: Leaf[] = [];
  const extra: number[] = [];
  const count = (n: number) => Math.max(2, Math.round(n * (0.45 + 0.55 * gb)));
  const vary = (c: string) => shade(c, (rng() - 0.5) * 0.25);
  switch (def.type) {
    case 'fern': {
      const n = count(9);
      for (let i = 0; i < n; i++) {
        const t = i / Math.max(1, n - 1);
        leaves.push({ x: (t - 0.5) * W * 0.5, y: 0, len: H * (0.6 + rng() * 0.4), ang: -Math.PI / 2 + (t - 0.5) * 1.6 + (rng() - 0.5) * 0.3,
          w: W * 0.13, bend: (t - 0.5) * 0.6, c: vary(c1), c2: vary(c2), h: 1, kind: 0 });
      }
      break;
    }
    case 'broad': {
      const n = count(7);
      for (let i = 0; i < n; i++) {
        const t = i / Math.max(1, n - 1);
        leaves.push({ x: (t - 0.5) * W * 0.6, y: -H * 0.05, len: H * (0.55 + rng() * 0.35), ang: -Math.PI / 2 + (t - 0.5) * 2.0,
          w: W * 0.22, bend: (t - 0.5) * 0.3, c: vary(c1), c2: vary(c2), h: 0.7, kind: 1 });
      }
      break;
    }
    case 'rosette': {
      const n = count(11);
      for (let i = 0; i < n; i++) {
        const t = i / Math.max(1, n - 1);
        leaves.push({ x: (rng() - 0.5) * W * 0.1, y: 0, len: H * (0.65 + rng() * 0.35) * (1 - Math.abs(t - 0.5) * 0.5),
          ang: -Math.PI / 2 + (t - 0.5) * 2.3, w: W * 0.12, bend: (t - 0.5) * 0.9, c: vary(c1), c2: vary(c2), h: 1, kind: 1 });
      }
      break;
    }
    case 'grass':
    case 'seagrass': {
      const n = count(def.type === 'grass' ? 13 : 16);
      for (let i = 0; i < n; i++) {
        leaves.push({ x: (rng() - 0.5) * W, y: 0, len: H * (0.55 + rng() * 0.45), ang: -Math.PI / 2 + (rng() - 0.5) * 0.35,
          w: (def.type === 'grass' ? 0.55 : 0.8) * (0.8 + rng() * 0.4), bend: (rng() - 0.5) * 0.8, c: vary(c1), c2: vary(c2), h: 1, kind: 2 });
      }
      break;
    }
    case 'stem': {
      // gövdeler ölçeksiz saklanır, çizimde büyüme ölçeği uygulanır
      const stems = count(4);
      for (let s = 0; s < stems; s++) {
        const sx = (s / Math.max(1, stems - 1) - 0.5) * def.w * 0.6 + (rng() - 0.5) * 1.2;
        const sh = def.h * (0.7 + rng() * 0.3);
        extra.push(sx, sh, (rng() - 0.5) * 0.5);
        const pairs = Math.max(3, Math.round(sh / 1.4));
        for (let k = 0; k < pairs; k++) {
          const t = (k + 1) / (pairs + 1);
          const col = mix(c1, c2, t);
          for (const side of [-1, 1]) {
            leaves.push({ x: sx, y: -sh * t, len: def.w * 0.22 * (1 - t * 0.35), ang: -Math.PI / 2 + side * (1.05 - t * 0.2),
              w: def.w * 0.06, bend: side * 0.3, c: vary(col), c2: vary(col), h: t, kind: 3 });
          }
        }
      }
      break;
    }
    case 'lily': {
      const n = count(7);
      for (let i = 0; i < n; i++) {
        const top = H * (0.35 + rng() * 0.65);
        leaves.push({ x: (rng() - 0.5) * 2, y: 0, len: top, ang: -Math.PI / 2 + (rng() - 0.5) * 0.5, w: 2.4 + rng() * 1.6,
          bend: (rng() - 0.5) * 0.6, c: vary(c1), c2: vary(c2), h: 1, kind: 4 });
      }
      break;
    }
    case 'fan': {
      // dal yapısı: [x1,y1,x2,y2,kalınlık,...]
      const rec = (x: number, y: number, ang: number, len: number, depth: number) => {
        const x2 = x + Math.cos(ang) * len;
        const y2 = y + Math.sin(ang) * len;
        extra.push(x, y, x2, y2, Math.max(0.08, 0.35 - depth * 0.07), depth);
        if (depth < 5) {
          rec(x2, y2, ang - 0.35 - rng() * 0.2, len * 0.72, depth + 1);
          rec(x2, y2, ang + 0.35 + rng() * 0.2, len * 0.72, depth + 1);
        }
      };
      rec(0, 0, -Math.PI / 2, def.h * 0.3, 0);
      break;
    }
    case 'branch': {
      const rec = (x: number, y: number, ang: number, len: number, depth: number) => {
        const x2 = x + Math.cos(ang) * len;
        const y2 = y + Math.sin(ang) * len;
        extra.push(x, y, x2, y2, Math.max(0.25, 1.1 - depth * 0.25), depth);
        if (depth < 3) {
          const k = 2 + (rng() < 0.4 ? 1 : 0);
          for (let i = 0; i < k; i++) rec(x2, y2, ang + (i - (k - 1) / 2) * 0.6 + (rng() - 0.5) * 0.3, len * (0.65 + rng() * 0.2), depth + 1);
        }
      };
      for (let i = 0; i < 3; i++) rec((i - 1) * def.w * 0.25, 0, -Math.PI / 2 + (i - 1) * 0.5, def.h * 0.35, 0);
      break;
    }
    default: {
      // moss, ball, carpet, macro, zoa, mushroom, anemone, brain, floating: ek veriyle
      const n = { moss: 26, ball: 1, carpet: 40, macro: 7, zoa: 14, mushroom: 5, anemone: 22, brain: 1, floating: 6 }[def.type] ?? 10;
      for (let i = 0; i < count(n); i++) extra.push(rng(), rng(), rng(), rng());
    }
  }
  const shape: PlantShape = { key, leaves, extra, colors: { c1, c2, c3 } };
  shapeCache.set(id, shape);
  return shape;
}

/** Bitkiyi çizer. (bx, by): taban; time: saniye; k: ölçek (derinlik) */
export function drawPlant(
  ctx: CanvasRenderingContext2D,
  def: PlantDef,
  shape: PlantShape,
  g: number,
  bx: number,
  by: number,
  k: number,
  time: number,
  flip: boolean,
  surfaceY: number,
) {
  const size = 0.35 + 0.65 * g;
  const W = def.w * size;
  const H = def.h * size;
  const swayBase = Math.sin(time * 0.9 + bx * 0.35) * 0.12 + Math.sin(time * 1.7 + bx) * 0.04;
  const { c1, c2, c3 } = shape.colors;
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(flip ? -k : k, k);
  switch (def.type) {
    case 'fern':
    case 'rosette':
    case 'broad': {
      if (def.type === 'fern') {
        ctx.strokeStyle = '#5b4632';
        ctx.lineWidth = 0.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-W * 0.3, -0.2);
        ctx.lineTo(W * 0.3, -0.25);
        ctx.stroke();
      }
      for (const L of shape.leaves) drawBladeLeaf(ctx, L, swayBase, def.type === 'broad');
      break;
    }
    case 'grass':
    case 'seagrass': {
      for (const L of shape.leaves) {
        const sw = swayBase * 1.6 + Math.sin(time * 1.3 + L.x) * 0.08;
        const tipX = L.x + Math.cos(L.ang) * L.len + (L.bend + sw) * L.len * 0.5;
        const tipY = Math.max(-(by - surfaceY) / k + 0.5, L.y + Math.sin(L.ang) * L.len);
        const midX = L.x + (L.bend * 0.3 + sw * 0.5) * L.len * 0.5;
        const midY = L.y + (tipY - L.y) * 0.55;
        ctx.fillStyle = L.c;
        ctx.beginPath();
        ctx.moveTo(L.x - L.w / 2, L.y);
        ctx.quadraticCurveTo(midX - L.w / 2, midY, tipX, tipY);
        ctx.quadraticCurveTo(midX + L.w / 2, midY, L.x + L.w / 2, L.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = alpha(L.c2, 0.5);
        ctx.lineWidth = 0.12;
        ctx.beginPath();
        ctx.moveTo(L.x, L.y);
        ctx.quadraticCurveTo(midX, midY, tipX, tipY);
        ctx.stroke();
      }
      break;
    }
    case 'stem': {
      ctx.lineCap = 'round';
      for (let i = 0; i < shape.extra.length; i += 3) {
        const sx = shape.extra[i] * size;
        const sh = shape.extra[i + 1] * size;
        const lean = shape.extra[i + 2];
        ctx.strokeStyle = shade(c1, -0.25);
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.quadraticCurveTo(sx + lean * sh * 0.3, -sh * 0.5, sx + (lean + swayBase) * sh * 0.5, -sh);
        ctx.stroke();
      }
      for (const L of shape.leaves) {
        const sw = swayBase * L.h;
        const x = L.x * size + sw * -L.y * size * 0.5;
        const len = L.len * size;
        const ex = x + Math.cos(L.ang + sw) * len;
        const ey = L.y * size + Math.sin(L.ang + sw) * len;
        ctx.strokeStyle = L.c;
        ctx.lineWidth = Math.max(0.35, L.w * 1.4);
        ctx.beginPath();
        ctx.moveTo(x, L.y * size);
        ctx.quadraticCurveTo((x + ex) / 2 + L.bend * 0.6, (L.y * size + ey) / 2 - 0.3, ex, ey);
        ctx.stroke();
      }
      break;
    }
    case 'moss':
    case 'carpet': {
      const ex = shape.extra;
      for (let i = 0; i < ex.length; i += 4) {
        const x = (ex[i] - 0.5) * W;
        const hgt = def.type === 'moss' ? H * (0.3 + ex[i + 1] * 0.7) : H * (0.4 + ex[i + 1] * 0.6);
        const r = def.type === 'moss' ? 0.9 + ex[i + 2] * 1.2 : 0.45 + ex[i + 2] * 0.35;
        ctx.fillStyle = ex[i + 3] > 0.5 ? c1 : c2;
        ctx.beginPath();
        ctx.ellipse(x + swayBase * hgt * 0.3, -hgt * 0.6, r, r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (def.type === 'moss') {
        ctx.strokeStyle = alpha(c2, 0.7);
        ctx.lineWidth = 0.15;
        ctx.beginPath();
        for (let i = 0; i < ex.length; i += 4) {
          const x = (ex[i] - 0.5) * W;
          ctx.moveTo(x, -H * 0.2);
          ctx.lineTo(x + (ex[i + 1] - 0.5) * 2 + swayBase * 2, -H * (0.8 + ex[i + 2] * 0.4));
        }
        ctx.stroke();
      }
      break;
    }
    case 'ball': {
      const r = W / 2;
      const gg = ctx.createRadialGradient(-r * 0.3, -r * 1.3, r * 0.1, 0, -r, r);
      gg.addColorStop(0, shade(c2, 0.2));
      gg.addColorStop(1, shade(c1, -0.2));
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(0, -r, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = alpha(c2, 0.6);
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        ctx.moveTo(Math.cos(a) * r * 0.95, -r + Math.sin(a) * r * 0.95);
        ctx.lineTo(Math.cos(a) * r * 1.12, -r + Math.sin(a) * r * 1.12);
      }
      ctx.stroke();
      break;
    }
    case 'floating': {
      // yüzeyde: taban noktası yüzey y'si olarak verilir
      const ex = shape.extra;
      ctx.strokeStyle = alpha('#d8d2c0', 0.55);
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      for (let i = 0; i < ex.length; i += 4) {
        const x = (ex[i] - 0.5) * W;
        const len = 2 + ex[i + 1] * 5 * size;
        ctx.moveTo(x, 0.3);
        ctx.quadraticCurveTo(x + Math.sin(time + i) * 0.6, len * 0.5, x + Math.sin(time * 0.7 + i) * 0.9, len);
      }
      ctx.stroke();
      for (let i = 0; i < ex.length; i += 4) {
        const x = (ex[i] - 0.5) * W + Math.sin(time * 0.3 + i) * 0.2;
        const r = (1.1 + ex[i + 2] * 0.8) * size;
        ctx.fillStyle = shade(c1, -0.1);
        ctx.beginPath();
        ctx.ellipse(x, 0.15, r, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.ellipse(x, 0.0, r, r * 0.22, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'lily': {
      for (const L of shape.leaves) {
        const top = Math.min(L.len, (by - surfaceY) / k - 0.3);
        const sw = swayBase * 1.2;
        const tx = L.x + (L.bend + sw) * top * 0.3;
        ctx.strokeStyle = shade(c3, -0.1);
        ctx.lineWidth = 0.18;
        ctx.beginPath();
        ctx.moveTo(L.x, 0);
        ctx.quadraticCurveTo(L.x + L.bend * top * 0.2, -top * 0.5, tx, -top);
        ctx.stroke();
        const floating = L.len >= (by - surfaceY) / k - 0.5;
        ctx.save();
        ctx.translate(tx, -top);
        if (floating) {
          ctx.fillStyle = shade(c3, 0.05);
          ctx.beginPath();
          ctx.ellipse(0, 0, L.w, L.w * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.rotate(sw * 0.5 + L.bend * 0.5 + (L.bend > 0 ? 0.5 : -0.5));
          const lw = L.w * 0.55;
          const lh = L.w * 1.5;
          const lg = ctx.createLinearGradient(-lw, -lh, lw, 0);
          lg.addColorStop(0, L.c2);
          lg.addColorStop(1, L.c);
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-lw * 1.3, -lh * 0.15, -lw * 1.1, -lh * 0.75, 0, -lh);
          ctx.bezierCurveTo(lw * 1.1, -lh * 0.75, lw * 1.3, -lh * 0.15, 0, 0);
          ctx.fill();
          ctx.strokeStyle = alpha(shade(L.c, 0.35), 0.6);
          ctx.lineWidth = 0.1;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -lh * 0.95);
          for (let v = 1; v <= 3; v++) {
            const vy = -lh * (0.22 * v);
            ctx.moveTo(0, vy);
            ctx.lineTo(-lw * 0.7, vy - lh * 0.12);
            ctx.moveTo(0, vy);
            ctx.lineTo(lw * 0.7, vy - lh * 0.12);
          }
          ctx.stroke();
          ctx.fillStyle = alpha(shade(L.c, -0.45), 0.45);
          for (let s = 0; s < 5; s++) {
            ctx.beginPath();
            ctx.arc((s % 2 ? 0.35 : -0.4) * lw, -lh * (0.2 + s * 0.14), lw * 0.09, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }
      break;
    }
    case 'macro': {
      const ex = shape.extra;
      ctx.strokeStyle = shade(c1, -0.2);
      ctx.lineWidth = 0.25;
      ctx.beginPath();
      ctx.moveTo(-W / 2, -0.2);
      ctx.lineTo(W / 2, -0.25);
      ctx.stroke();
      for (let i = 0; i < ex.length; i += 4) {
        const x = (ex[i] - 0.5) * W * 0.9;
        const hh = H * (0.4 + ex[i + 1] * 0.6);
        const sw = swayBase * 2;
        ctx.strokeStyle = c1;
        ctx.lineWidth = 0.2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x + sw * 0.5, -hh * 0.5, x + sw, -hh);
        ctx.stroke();
        for (let b = 1; b <= 6; b++) {
          const t = b / 6.5;
          const bxp = x + sw * t;
          ctx.fillStyle = b % 2 ? c2 : c1;
          ctx.beginPath();
          ctx.arc(bxp + (b % 2 ? 0.45 : -0.45), -hh * t, 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'zoa': {
      const ex = shape.extra;
      for (let i = 0; i < ex.length; i += 4) {
        const x = (ex[i] - 0.5) * W;
        const hh = H * (0.4 + ex[i + 1] * 0.6);
        const r = 0.55 + ex[i + 2] * 0.35;
        ctx.fillStyle = shade(c1, -0.3);
        ctx.fillRect(x - r * 0.35, -hh, r * 0.7, hh);
        ctx.fillStyle = ex[i + 3] > 0.5 ? c2 : c1;
        ctx.beginPath();
        ctx.ellipse(x, -hh, r, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c3;
        ctx.beginPath();
        ctx.ellipse(x, -hh, r * 0.4, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'mushroom': {
      const ex = shape.extra;
      for (let i = 0; i < ex.length; i += 4) {
        const x = (ex[i] - 0.5) * W * 0.8;
        const hh = H * (0.3 + ex[i + 1] * 0.7);
        const r = 1.2 + ex[i + 2] * 1.2;
        ctx.fillStyle = shade(c1, -0.35);
        ctx.fillRect(x - 0.3, -hh, 0.6, hh);
        const mg = ctx.createRadialGradient(x, -hh, 0, x, -hh, r);
        mg.addColorStop(0, c3);
        mg.addColorStop(0.3, c2);
        mg.addColorStop(1, c1);
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.ellipse(x, -hh, r, r * 0.4, ex[i + 3] * 0.4 - 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'anemone': {
      const ex = shape.extra;
      ctx.fillStyle = shade(c1, -0.3);
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.15, W * 0.25, H * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < ex.length; i += 4) {
        const a = -Math.PI / 2 + (ex[i] - 0.5) * 2.6;
        const len = H * (0.5 + ex[i + 1] * 0.5);
        const sw = Math.sin(time * 1.2 + i) * 0.15 + swayBase;
        const tx = Math.cos(a + sw) * len * 0.9;
        const ty = -H * 0.2 + Math.sin(a + sw) * len;
        ctx.strokeStyle = ex[i + 3] > 0.5 ? c1 : shade(c1, 0.15);
        ctx.lineWidth = 0.7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -H * 0.2);
        ctx.quadraticCurveTo(tx * 0.4, (ty - H * 0.2) * 0.6, tx, ty);
        ctx.stroke();
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.arc(tx, ty, 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c3;
        ctx.beginPath();
        ctx.arc(tx, ty - 0.2, 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'brain': {
      const r = W / 2;
      const bg = ctx.createRadialGradient(-r * 0.3, -H * 0.8, 0, 0, -H * 0.4, r * 1.1);
      bg.addColorStop(0, shade(c2, 0.1));
      bg.addColorStop(1, c1);
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, H, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, r, H, 0, Math.PI, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = alpha(c3, 0.7);
      ctx.lineWidth = 0.25;
      const rng = mulberry32(hashString(shape.key.split('|')[0]));
      for (let i = 0; i < 12; i++) {
        let x = (rng() - 0.5) * W;
        let y = -rng() * H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 8; s++) {
          x += (rng() - 0.5) * 2;
          y += (rng() - 0.5) * 1.2;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'fan':
    case 'branch': {
      const ex = shape.extra;
      ctx.lineCap = 'round';
      for (let i = 0; i < ex.length; i += 6) {
        const depth = ex[i + 5];
        const sw = swayBase * (def.type === 'fan' ? 1 : 0.2) * (depth + 1) * 0.3;
        ctx.strokeStyle = depth >= (def.type === 'fan' ? 4 : 3) ? c2 : c1;
        ctx.lineWidth = ex[i + 4] * size;
        ctx.beginPath();
        ctx.moveTo(ex[i] * size + sw * -ex[i + 1] * 0.1, ex[i + 1] * size);
        ctx.lineTo(ex[i + 2] * size + sw * -ex[i + 3] * 0.1, ex[i + 3] * size);
        ctx.stroke();
      }
      if (def.type === 'branch') {
        ctx.fillStyle = c3;
        for (let i = 0; i < ex.length; i += 6) {
          if (ex[i + 5] < 3) continue;
          ctx.beginPath();
          ctx.arc(ex[i + 2] * size, ex[i + 3] * size, 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
  }
  ctx.restore();
}

function drawBladeLeaf(ctx: CanvasRenderingContext2D, L: Leaf, sway: number, broad: boolean) {
  const a = L.ang + sway * 0.8 * L.h + L.bend * 0.2;
  const tx = L.x + Math.cos(a) * L.len;
  const ty = L.y + Math.sin(a) * L.len;
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  const w = L.w * (broad ? 1 : 0.8);
  const bendX = L.bend * L.len * 0.15;
  const mx = (L.x + tx) / 2 + bendX;
  const my = (L.y + ty) / 2;
  const g = ctx.createLinearGradient(L.x, L.y, tx, ty);
  g.addColorStop(0, L.c);
  g.addColorStop(1, L.c2);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(L.x, L.y);
  if (broad) {
    ctx.bezierCurveTo(mx + nx * w * 1.2, my + ny * w * 1.2, tx + nx * w * 0.6, ty + ny * w * 0.6, tx, ty);
    ctx.bezierCurveTo(tx - nx * w * 0.6, ty - ny * w * 0.6, mx - nx * w * 1.2, my - ny * w * 1.2, L.x, L.y);
  } else {
    ctx.quadraticCurveTo(mx + nx * w, my + ny * w, tx, ty);
    ctx.quadraticCurveTo(mx - nx * w, my - ny * w, L.x, L.y);
  }
  ctx.fill();
  ctx.strokeStyle = alpha(shade(L.c, -0.35), 0.45);
  ctx.lineWidth = 0.12;
  ctx.beginPath();
  ctx.moveTo(L.x, L.y);
  ctx.quadraticCurveTo(mx, my, tx, ty);
  ctx.stroke();
  if (broad) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(mx + nx * w * 0.3, my + ny * w * 0.3, w * 0.4, L.len * 0.18, a + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Seçim/sürükleme için bitkinin kabaca sınır kutusu (tabana göre) */
export function plantBounds(def: PlantDef, g: number) {
  const size = 0.35 + 0.65 * g;
  const w = def.w * size;
  const h = def.type === 'floating' ? 6 : def.h * size;
  return { w, h };
}
