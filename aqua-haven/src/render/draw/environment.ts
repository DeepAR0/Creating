import type { TankState } from '../../game/types';
import type { TankGeom } from '../layout';
import { alpha, mix, shade } from '../color';
import { hashString, mulberry32 } from '../../game/util';

// ------------------------------------------------------------------ su teması

export interface WaterTheme {
  top: string;
  mid: string;
  bottom: string;
  haze: string; // uzak nesnelerin sis rengi
}

export const WATER_THEMES: Record<string, WaterTheme> = {
  deepBlue: { top: '#43b3d6', mid: '#1b7aa3', bottom: '#0c3f63', haze: '#2a86ad' },
  jungle: { top: '#56b89a', mid: '#237a66', bottom: '#0c3d33', haze: '#2f8c74' },
  rocky: { top: '#5fa9c4', mid: '#2c6f8c', bottom: '#15384d', haze: '#3a7b95' },
  sunken: { top: '#3f9dc9', mid: '#1c5f8f', bottom: '#0b2f52', haze: '#2a6f9c' },
  nebula: { top: '#3b3b8f', mid: '#23205a', bottom: '#0d0b26', haze: '#3a2f7a' },
  reef: { top: '#4fd1e8', mid: '#1596b8', bottom: '#0a4d73', haze: '#2aa7c7' },
  ocean: { top: '#3fb6e8', mid: '#126fa8', bottom: '#062f5c', haze: '#1f7fb5' },
};

export function themeOf(t: TankState): WaterTheme {
  return WATER_THEMES[t.background] ?? WATER_THEMES.deepBlue;
}

/** Tank iç arka planı (su gradyanı + uzak siluetler). Dünya koordinatında çizilir. */
export function drawWaterBackground(ctx: CanvasRenderingContext2D, g: TankGeom, t: TankState) {
  const th = themeOf(t);
  const rng = mulberry32(hashString(t.background + g.W));
  const grad = ctx.createLinearGradient(0, 0, 0, g.H);
  grad.addColorStop(0, th.top);
  grad.addColorStop(0.45, th.mid);
  grad.addColorStop(1, th.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, g.W, g.H);

  const far = alpha(shade(th.bottom, -0.15), 0.55);
  const farLight = alpha(th.haze, 0.35);
  switch (t.background) {
    case 'jungle': {
      for (let i = 0; i < Math.ceil(g.W / 3); i++) {
        const x = rng() * g.W;
        const h = g.H * (0.3 + rng() * 0.55);
        ctx.fillStyle = alpha(shade('#0e5a45', rng() * 0.2), 0.55);
        ctx.beginPath();
        ctx.moveTo(x - 1, g.subBackY);
        ctx.quadraticCurveTo(x + (rng() - 0.5) * 6, g.subBackY - h * 0.6, x + (rng() - 0.5) * 4, g.subBackY - h);
        ctx.quadraticCurveTo(x + (rng() - 0.5) * 6, g.subBackY - h * 0.5, x + 1.2, g.subBackY);
        ctx.fill();
      }
      ctx.strokeStyle = alpha('#3b2a1a', 0.45);
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 4; i++) {
        const x = rng() * g.W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 5, g.H * 0.3, x - 6, g.H * 0.5, x + 3, g.subBackY);
        ctx.stroke();
      }
      break;
    }
    case 'rocky': {
      for (let layer = 0; layer < 4; layer++) {
        ctx.fillStyle = alpha(mix('#4a5f6b', th.bottom, layer * 0.2), 0.55 - layer * 0.08);
        ctx.beginPath();
        const base = g.subBackY - layer * g.H * 0.1;
        ctx.moveTo(0, g.H);
        ctx.lineTo(0, base - g.H * 0.2);
        for (let x = 0; x <= g.W; x += 4) ctx.lineTo(x, base - g.H * (0.15 + rng() * 0.25) - layer * 2);
        ctx.lineTo(g.W, g.H);
        ctx.fill();
      }
      break;
    }
    case 'sunken': {
      ctx.fillStyle = far;
      for (let i = 0; i < Math.ceil(g.W / 18); i++) {
        const x = 6 + i * 18 + rng() * 6;
        const h = g.H * (0.3 + rng() * 0.4);
        ctx.fillRect(x, g.subBackY - h, 2.6, h);
        ctx.fillRect(x - 0.8, g.subBackY - h - 1, 4.2, 1);
        if (rng() < 0.5) {
          ctx.beginPath();
          ctx.arc(x + 9, g.subBackY - h * 0.6, 6, Math.PI, 0);
          ctx.lineTo(x + 15, g.subBackY);
          ctx.lineTo(x + 13, g.subBackY);
          ctx.arc(x + 9, g.subBackY - h * 0.6 + 0.5, 4, 0, Math.PI, true);
          ctx.lineTo(x + 3, g.subBackY);
          ctx.fill();
        }
      }
      break;
    }
    case 'nebula': {
      for (let i = 0; i < 5; i++) {
        const x = rng() * g.W;
        const y = rng() * g.H * 0.7;
        const r = 8 + rng() * 14;
        const c = ['#a855f7', '#ec4899', '#22d3ee', '#6366f1'][i % 4];
        const ng = ctx.createRadialGradient(x, y, 0, x, y, r);
        ng.addColorStop(0, alpha(c, 0.35));
        ng.addColorStop(1, alpha(c, 0));
        ctx.fillStyle = ng;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < g.W * 1.2; i++) {
        ctx.beginPath();
        ctx.arc(rng() * g.W, rng() * g.subBackY, 0.08 + rng() * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'reef': {
      const cols = ['#f472b6', '#fb923c', '#a78bfa', '#34d399', '#facc15', '#f87171'];
      for (let i = 0; i < Math.ceil(g.W / 4); i++) {
        const x = rng() * g.W;
        const r = 2 + rng() * 5;
        ctx.fillStyle = alpha(mix(cols[i % cols.length], th.haze, 0.6), 0.55);
        ctx.beginPath();
        ctx.ellipse(x, g.subBackY - r * 0.4, r, r * (0.6 + rng() * 0.8), 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < Math.ceil(g.W / 8); i++) {
        const x = rng() * g.W;
        ctx.strokeStyle = alpha(mix(cols[(i + 2) % cols.length], th.haze, 0.55), 0.5);
        ctx.lineWidth = 0.6;
        ctx.lineCap = 'round';
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.moveTo(x, g.subBackY);
          ctx.quadraticCurveTo(x + (k - 2) * 1.5, g.subBackY - 4, x + (k - 2) * 2.4, g.subBackY - 6 - rng() * 4);
          ctx.stroke();
        }
      }
      break;
    }
    case 'ocean': {
      ctx.fillStyle = alpha('#0a2f55', 0.35);
      for (let s = 0; s < 3; s++) {
        const cx = rng() * g.W;
        const cy = g.H * (0.25 + rng() * 0.35);
        for (let i = 0; i < 20; i++) {
          ctx.beginPath();
          ctx.ellipse(cx + (rng() - 0.5) * 12, cy + (rng() - 0.5) * 5, 0.6, 0.25, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    default: {
      // derin mavi: uzak kaya ve bitki siluetleri
      for (let i = 0; i < Math.ceil(g.W / 7); i++) {
        const x = rng() * g.W;
        const r = 3 + rng() * 6;
        ctx.fillStyle = far;
        ctx.beginPath();
        ctx.ellipse(x, g.subBackY + 0.5, r, r * (0.5 + rng() * 0.5), 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = farLight;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < Math.ceil(g.W / 3); i++) {
        const x = rng() * g.W;
        const h = g.H * (0.15 + rng() * 0.35);
        ctx.beginPath();
        ctx.moveTo(x, g.subBackY);
        ctx.quadraticCurveTo(x + (rng() - 0.5) * 3, g.subBackY - h * 0.5, x + (rng() - 0.5) * 2, g.subBackY - h);
        ctx.stroke();
      }
    }
  }
  // Uzaklık sisi (alt kısım)
  const fog = ctx.createLinearGradient(0, g.H * 0.4, 0, g.subBackY);
  fog.addColorStop(0, alpha(th.haze, 0));
  fog.addColorStop(1, alpha(th.haze, 0.35));
  ctx.fillStyle = fog;
  ctx.fillRect(0, g.H * 0.4, g.W, g.subBackY - g.H * 0.4);
  // Yüzey altı hava boşluğu
  const air = ctx.createLinearGradient(0, 0, 0, g.surfaceY);
  air.addColorStop(0, 'rgba(200,225,235,0.5)');
  air.addColorStop(1, 'rgba(160,210,230,0.25)');
  ctx.fillStyle = air;
  ctx.fillRect(0, 0, g.W, g.surfaceY);
}

// ------------------------------------------------------------------ zemin

const SUBSTRATES: Record<string, { base: string; top: string; grains: string[]; big?: boolean; sparkle?: boolean }> = {
  sand: { base: '#c8ad7f', top: '#e8d5ac', grains: ['#b89a6a', '#dcc79c', '#a88b5c', '#efe2c4'] },
  gravel: { base: '#8a7f70', top: '#b0a595', grains: ['#6e6457', '#9c9282', '#c2b8a8', '#5a534a', '#a58f73'], big: true },
  black: { base: '#1f2124', top: '#3a3d42', grains: ['#2b2e33', '#45484e', '#16181b'], sparkle: true },
  rainbow: { base: '#6b6b8f', top: '#9d9dbf', grains: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#fde047'], big: true },
  coralSand: { base: '#e6dccd', top: '#f7f1e8', grains: ['#f1e6d6', '#d9cab3', '#fbd5c5', '#ffffff'] },
};

/** Zemin (arka kenardan öne eğimli yüzey + ön kesit). */
export function drawSubstrate(ctx: CanvasRenderingContext2D, g: TankGeom, t: TankState) {
  const s = SUBSTRATES[t.substrate] ?? SUBSTRATES.sand;
  const rng = mulberry32(hashString(t.substrate + g.W));
  const edge: [number, number][] = [];
  for (let x = 0; x <= g.W + 0.01; x += 2) edge.push([x, g.subBackY + Math.sin(x * 0.13) * 0.5 + (rng() - 0.5) * 0.35]);
  const path = new Path2D();
  path.moveTo(0, g.H);
  for (const [x, y] of edge) path.lineTo(x, y);
  path.lineTo(g.W, g.H);
  path.closePath();
  const gr = ctx.createLinearGradient(0, g.subBackY, 0, g.H);
  gr.addColorStop(0, s.top);
  gr.addColorStop(0.55, s.base);
  gr.addColorStop(1, shade(s.base, -0.3));
  ctx.fillStyle = gr;
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  const area = g.W * (g.H - g.subBackY);
  const n = Math.min(9000, Math.floor(area * (s.big ? 1.4 : 3)));
  for (let i = 0; i < n; i++) {
    const x = rng() * g.W;
    const y = g.subBackY + rng() * (g.H - g.subBackY);
    const depthK = (y - g.subBackY) / (g.H - g.subBackY);
    const r = (s.big ? 0.22 + rng() * 0.3 : 0.07 + rng() * 0.1) * (0.7 + depthK * 0.5);
    ctx.fillStyle = s.grains[Math.floor(rng() * s.grains.length)];
    ctx.globalAlpha = 0.55 + rng() * 0.45;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.2, r * 0.8, rng(), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (s.sparkle) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < n / 30; i++) {
      ctx.beginPath();
      ctx.arc(rng() * g.W, g.subBackY + rng() * (g.H - g.subBackY), 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (t.substrate === 'coralSand') {
    ctx.fillStyle = 'rgba(255,240,230,0.9)';
    for (let i = 0; i < g.W / 2; i++) {
      ctx.beginPath();
      ctx.ellipse(rng() * g.W, g.subBackY + rng() * (g.H - g.subBackY), 0.35, 0.18, rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Ön cam kesiti: tabakalar
  const front = ctx.createLinearGradient(0, g.subFrontY - 1.5, 0, g.H);
  front.addColorStop(0, 'rgba(0,0,0,0)');
  front.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = front;
  ctx.fillRect(0, g.subFrontY - 1.5, g.W, g.H - g.subFrontY + 1.5);
  // Arka kenar gölgesi
  const back = ctx.createLinearGradient(0, g.subBackY - 0.5, 0, g.subBackY + 2.5);
  back.addColorStop(0, 'rgba(0,0,0,0.18)');
  back.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = back;
  ctx.fillRect(0, g.subBackY - 0.5, g.W, 3);
  ctx.restore();
}

// ------------------------------------------------------------------ oda

/** Oda: duvar, dolap, pencere, saksı, tablo. Dünya koordinatında (tank 0..W). */
export function drawRoom(ctx: CanvasRenderingContext2D, g: TankGeom, x0: number, x1: number, y0: number, y1: number) {
  const wall = ctx.createLinearGradient(0, y0, 0, y1);
  wall.addColorStop(0, '#20384a');
  wall.addColorStop(1, '#2d4a5c');
  ctx.fillStyle = wall;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // duvar kağıdı çizgileri
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let x = Math.floor(x0 / 4) * 4; x < x1; x += 8) ctx.fillRect(x, y0, 4, y1 - y0);
  // pervaz
  const railY = g.H * 0.78;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x0, railY, x1 - x0, 0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(x0, railY - 0.3, x1 - x0, 0.3);
  const lower = ctx.createLinearGradient(0, railY, 0, y1);
  lower.addColorStop(0, '#1b3140');
  lower.addColorStop(1, '#152633');
  ctx.fillStyle = lower;
  ctx.fillRect(x0, railY + 0.6, x1 - x0, y1 - railY);

  // Dolap (tank altı)
  const standTop = g.H;
  const sx0 = -2.2;
  const sx1 = g.W + 2.2;
  const wood = ctx.createLinearGradient(0, standTop, 0, standTop + g.H);
  wood.addColorStop(0, '#6b4424');
  wood.addColorStop(1, '#3d2613');
  ctx.fillStyle = '#7d5230';
  ctx.fillRect(sx0 - 0.6, standTop + 0.5, sx1 - sx0 + 1.2, 1.4);
  ctx.fillStyle = wood;
  ctx.fillRect(sx0, standTop + 1.9, sx1 - sx0, g.H * 1.2);
  const doors = Math.max(2, Math.round((sx1 - sx0) / 20));
  const dw = (sx1 - sx0) / doors;
  for (let i = 0; i < doors; i++) {
    const dx = sx0 + i * dw;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.25;
    ctx.strokeRect(dx + 0.8, standTop + 3, dw - 1.6, g.H);
    ctx.fillStyle = '#c9a15a';
    ctx.beginPath();
    ctx.arc(i % 2 ? dx + 2 : dx + dw - 2, standTop + 6, 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  const leftSpace = -x0;
  const rightSpace = x1 - g.W;
  // Sol: saksıda deve tabanı bitkisi
  if (leftSpace > 9) {
    const px = -Math.min(leftSpace - 5, 11);
    const py = standTop + 0.5;
    ctx.fillStyle = '#b85c38';
    ctx.beginPath();
    ctx.moveTo(px - 3, py - 5);
    ctx.lineTo(px + 3, py - 5);
    ctx.lineTo(px + 2.3, py);
    ctx.lineTo(px - 2.3, py);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9c4a2b';
    ctx.fillRect(px - 3.2, py - 5.6, 6.4, 0.9);
    const leaf = (a: number, len: number) => {
      ctx.save();
      ctx.translate(px, py - 5.5);
      ctx.rotate(a);
      ctx.strokeStyle = '#2d5a27';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -len * 0.6);
      ctx.stroke();
      ctx.fillStyle = '#3f7d34';
      ctx.beginPath();
      ctx.ellipse(0, -len * 0.75, len * 0.3, len * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#20384a';
      ctx.fillRect(-0.15, -len, 0.3, len * 0.5);
      ctx.restore();
    };
    [-0.9, -0.45, 0, 0.4, 0.85].forEach((a, i) => leaf(a, 9 + (i % 2) * 2.5));
  }
  // Sol üst: balık tablosu
  if (leftSpace > 12) {
    const fx = -Math.min(leftSpace - 3, 17);
    const fy = -g.H * 0.05;
    ctx.fillStyle = '#c9a15a';
    ctx.fillRect(fx - 5, fy - 6, 10, 8);
    ctx.fillStyle = '#9ad3e8';
    ctx.fillRect(fx - 4.2, fy - 5.2, 8.4, 6.4);
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(fx, fy - 2, 2, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx - 1.8, fy - 2);
    ctx.lineTo(fx - 3, fy - 3);
    ctx.lineTo(fx - 3, fy - 1);
    ctx.fill();
  }
  // Sağ: pencere
  if (rightSpace > 11) {
    const wx = g.W + Math.min(rightSpace - 5, 13);
    const wy = -g.H * 0.08;
    const hour = new Date().getHours();
    const day = hour >= 7 && hour < 19;
    const sky = ctx.createLinearGradient(0, wy - 8, 0, wy + 8);
    sky.addColorStop(0, day ? '#7cc8ef' : '#0b1733');
    sky.addColorStop(1, day ? '#d8f0fb' : '#23305a');
    ctx.fillStyle = '#d9d2c3';
    ctx.fillRect(wx - 6, wy - 9, 12, 18);
    ctx.fillStyle = sky;
    ctx.fillRect(wx - 5.2, wy - 8.2, 10.4, 16.4);
    if (day) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(wx - 1.5, wy - 3, 2.5, 0.8, 0, 0, Math.PI * 2);
      ctx.ellipse(wx + 1.5, wy + 1, 2, 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#f8f4d0';
      ctx.beginPath();
      ctx.arc(wx + 2, wy - 4, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(wx - 4 + ((i * 37) % 8), wy - 7 + ((i * 53) % 13), 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#d9d2c3';
    ctx.fillRect(wx - 0.3, wy - 8.2, 0.6, 16.4);
    ctx.fillRect(wx - 5.2, wy - 0.3, 10.4, 0.6);
    // perde
    ctx.fillStyle = '#7b4b6a';
    ctx.beginPath();
    ctx.moveTo(wx - 7, wy - 10);
    ctx.quadraticCurveTo(wx - 4.5, wy, wx - 6.5, wy + 11);
    ctx.lineTo(wx - 8, wy + 11);
    ctx.lineTo(wx - 8, wy - 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(wx + 7, wy - 10);
    ctx.quadraticCurveTo(wx + 4.5, wy, wx + 6.5, wy + 11);
    ctx.lineTo(wx + 8, wy + 11);
    ctx.lineTo(wx + 8, wy - 10);
    ctx.fill();
  }
  // Tank gölgesi duvarda
  const sh = ctx.createLinearGradient(0, -1, 0, g.H);
  sh.addColorStop(0, 'rgba(0,0,0,0.0)');
  sh.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = sh;
  ctx.fillRect(-1.2, -1, g.W + 2.4, g.H + 1);
}

// ------------------------------------------------------------------ çerçeve ve kapak

export function drawTankFrameFront(ctx: CanvasRenderingContext2D, g: TankGeom) {
  // Cam yansımaları
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, g.W, g.H);
  ctx.clip();
  const refl = (x: number, w: number, a: number) => {
    const gr = ctx.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, `rgba(255,255,255,${a})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + w, 0);
    ctx.lineTo(x + w - g.H * 0.35, g.H);
    ctx.lineTo(x - g.H * 0.35, g.H);
    ctx.closePath();
    ctx.fill();
  };
  refl(g.W * 0.12, g.W * 0.05, 0.05);
  refl(g.W * 0.19, g.W * 0.015, 0.06);
  refl(g.W * 0.72, g.W * 0.08, 0.035);
  ctx.restore();
  // Kenar camları
  const side = (x: number, dir: number) => {
    const gr = ctx.createLinearGradient(x, 0, x + dir * 0.9, 0);
    gr.addColorStop(0, 'rgba(210,240,255,0.35)');
    gr.addColorStop(1, 'rgba(210,240,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(Math.min(x, x + dir * 0.9), 0, 0.9, g.H);
    ctx.fillStyle = 'rgba(20,30,35,0.9)';
    ctx.fillRect(dir > 0 ? x - 0.25 : x - 0.05, 0, 0.3, g.H);
  };
  side(0, 1);
  side(g.W, -1);
  // Alt ve üst çerçeve
  ctx.fillStyle = '#141a1f';
  ctx.fillRect(-0.4, g.H - 0.35, g.W + 0.8, 0.9);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(-0.4, g.H - 0.35, g.W + 0.8, 0.12);
  ctx.fillStyle = '#141a1f';
  ctx.fillRect(-0.4, -0.35, g.W + 0.8, 0.7);
}

/** Kapak ve lamba (ışık açık/kapalı) */
export function drawLid(ctx: CanvasRenderingContext2D, g: TankGeom, lightOn: boolean, lightTier: number, time: number) {
  const y = -2.2;
  ctx.fillStyle = '#1b2227';
  ctx.fillRect(-0.6, y, g.W + 1.2, 1.9);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(-0.6, y, g.W + 1.2, 0.25);
  // LED şerit
  const ledColor = lightTier >= 4 ? '#bfe3ff' : lightTier === 3 ? '#fff7e6' : lightTier === 2 ? '#ffe9f3' : '#fffbe8';
  if (lightOn) {
    ctx.fillStyle = ledColor;
    ctx.fillRect(1, y + 1.55, g.W - 2, 0.35);
    const glow = ctx.createLinearGradient(0, y + 1.9, 0, y + 1.9 + g.H * 0.5);
    glow.addColorStop(0, alpha(ledColor, 0.28));
    glow.addColorStop(1, alpha(ledColor, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, y + 1.9, g.W, g.H * 0.5);
  } else {
    ctx.fillStyle = `rgba(90,140,255,${0.55 + 0.1 * Math.sin(time)})`;
    for (let x = 2; x < g.W - 1; x += 4) ctx.fillRect(x, y + 1.6, 0.6, 0.25);
  }
}

// ------------------------------------------------------------------ ekipman görselleri

export function drawEquipmentBack(ctx: CanvasRenderingContext2D, g: TankGeom, t: TankState, time: number) {
  const filter = t.equip.filter ?? 0;
  const heater = t.equip.heater ?? 0;
  const air = t.equip.air ?? 0;
  // Isıtıcı (sol arka, çapraz cam tüp)
  if (heater > 0) {
    const hx = 2.2;
    const heating = t.temp < t.targetTemp - 0.05;
    ctx.save();
    ctx.translate(hx, g.surfaceY + 1);
    ctx.rotate(0.35);
    const len = Math.min(g.H * 0.55, 18);
    ctx.fillStyle = 'rgba(210,235,245,0.45)';
    ctx.fillRect(-0.6, 0, 1.2, len);
    ctx.fillStyle = 'rgba(40,40,40,0.9)';
    ctx.fillRect(-0.7, -0.8, 1.4, 1.4);
    ctx.fillStyle = heating ? `rgba(255,120,40,${0.7 + 0.2 * Math.sin(time * 3)})` : 'rgba(120,120,120,0.7)';
    ctx.fillRect(-0.3, len * 0.25, 0.6, len * 0.65);
    ctx.fillStyle = heating ? '#ff5a1f' : '#3a8d3a';
    ctx.beginPath();
    ctx.arc(0, -0.1, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Filtre
  if (filter === 1) {
    const fx = g.W - 3.2;
    const base = g.subBackY + 0.4;
    ctx.fillStyle = '#1f2a2e';
    ctx.fillRect(fx - 1.4, base - 4.2, 2.8, 4.2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 12; i++) ctx.fillRect(fx - 1.2 + (i % 4) * 0.7, base - 4 + Math.floor(i / 4) * 1.3, 0.3, 0.3);
    ctx.fillStyle = 'rgba(210,235,245,0.4)';
    ctx.fillRect(fx - 0.25, g.surfaceY + 0.3, 0.5, base - 4.2 - g.surfaceY);
  } else if (filter === 2) {
    const fx = g.W - 7;
    ctx.fillStyle = 'rgba(210,235,245,0.35)';
    ctx.fillRect(fx + 2, g.surfaceY, 1, g.H * 0.4);
    // şelale köpüğü
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 6; i++) {
      const x = fx - 1 + ((time * 3 + i * 0.7) % 3);
      ctx.beginPath();
      ctx.arc(x, g.surfaceY + 0.2 + Math.sin(time * 5 + i) * 0.15, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (filter >= 3) {
    ctx.strokeStyle = 'rgba(160,220,200,0.45)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(g.W - 4, -0.5);
    ctx.lineTo(g.W - 4, g.H * 0.55);
    ctx.stroke();
    ctx.fillStyle = 'rgba(160,220,200,0.35)';
    ctx.fillRect(g.W - 4.8, g.H * 0.55, 1.6, 2);
    ctx.beginPath();
    ctx.moveTo(3.5, -0.5);
    ctx.lineTo(3.5, g.surfaceY + 1.4);
    ctx.lineTo(6, g.surfaceY + 1.8);
    ctx.stroke();
  }
  // Hava taşı
  if (air > 0) {
    const ax = g.W * 0.72;
    const ay = g.subBackY + 0.3;
    const w = 2 + air * 1.5;
    ctx.fillStyle = '#6b7f86';
    ctx.fillRect(ax - w / 2, ay - 0.6, w, 0.6);
    ctx.strokeStyle = 'rgba(200,230,240,0.35)';
    ctx.lineWidth = 0.18;
    ctx.beginPath();
    ctx.moveTo(ax + w / 2, ay - 0.3);
    ctx.quadraticCurveTo(g.W - 1.2, ay - 1, g.W - 1.2, 0);
    ctx.stroke();
  }
}

// ------------------------------------------------------------------ ışık hüzmeleri & kostik

export function drawLightRays(ctx: CanvasRenderingContext2D, g: TankGeom, time: number, night: boolean) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const n = Math.max(4, Math.round(g.W / 9));
  for (let i = 0; i < n; i++) {
    const phase = time * 0.15 + i * 1.7;
    const x = ((i + 0.5) / n) * g.W + Math.sin(phase) * 3;
    const w = 2 + ((i * 7) % 5) + Math.sin(phase * 1.3) * 1.2;
    const a = (night ? 0.035 : 0.075) * (0.6 + 0.4 * Math.sin(phase * 0.7 + i));
    const gr = ctx.createLinearGradient(0, g.surfaceY, 0, g.H * 0.95);
    const c = night ? '140,170,255' : '255,255,235';
    gr.addColorStop(0, `rgba(${c},${a})`);
    gr.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = gr;
    const skew = g.H * 0.28;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, g.surfaceY);
    ctx.lineTo(x + w / 2, g.surfaceY);
    ctx.lineTo(x + w * 1.6 + skew, g.H * 0.95);
    ctx.lineTo(x - w * 0.6 + skew, g.H * 0.95);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Tek seferlik kostik doku üretir (döşenebilir) */
export function makeCausticTile(size = 128): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const rng = mulberry32(1234);
  const pts: [number, number][] = [];
  for (let i = 0; i < 18; i++) pts.push([rng() * size, rng() * size]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let d1 = Infinity;
      let d2 = Infinity;
      for (const [px, py] of pts) {
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const dx = x - (px + ox * size);
            const dy = y - (py + oy * size);
            const d = dx * dx + dy * dy;
            if (d < d1) {
              d2 = d1;
              d1 = d;
            } else if (d < d2) d2 = d;
          }
        }
      }
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      const v = Math.max(0, 1 - edge / (size * 0.07));
      const i = (y * size + x) * 4;
      const b = Math.pow(v, 1.6) * 255;
      img.data[i] = b;
      img.data[i + 1] = b;
      img.data[i + 2] = b;
      img.data[i + 3] = b;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Kostik ışık desenleri: yalnızca zemin üzerinde, yumuşak ve hareketli */
export function drawCaustics(
  ctx: CanvasRenderingContext2D,
  g: TankGeom,
  tile: HTMLCanvasElement,
  time: number,
  strength: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.rect(0, g.subBackY + 0.3, g.W, g.H - g.subBackY);
  ctx.clip();
  const scale = Math.max(12, g.H * 0.55);
  const y0 = g.subBackY - scale;
  for (let layer = 0; layer < 2; layer++) {
    const off = (time * (layer ? 0.9 : -0.6)) % scale;
    const offY = (time * (layer ? 0.35 : 0.2)) % scale;
    const sc = layer ? scale * 1.37 : scale;
    ctx.globalAlpha = strength * (layer ? 0.45 : 0.6);
    for (let x = -sc + off; x < g.W + sc; x += sc) {
      for (let y = y0 + offY; y < g.H + sc; y += sc * 0.5) {
        ctx.drawImage(tile, x, y, sc, sc * 0.5);
      }
    }
  }
  ctx.restore();
}

/** Su yüzeyi (alt yüzey yansıması) */
export function drawSurface(ctx: CanvasRenderingContext2D, g: TankGeom, time: number, night: boolean) {
  const y = g.surfaceY;
  const gr = ctx.createLinearGradient(0, y - 0.3, 0, y + 1.6);
  gr.addColorStop(0, night ? 'rgba(150,180,255,0.35)' : 'rgba(230,250,255,0.55)');
  gr.addColorStop(1, 'rgba(230,250,255,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(0, y + 1.6);
  for (let x = 0; x <= g.W; x += 1.5) ctx.lineTo(x, y + Math.sin(x * 0.45 + time * 1.6) * 0.18 + Math.sin(x * 0.17 - time) * 0.12);
  ctx.lineTo(g.W, y + 1.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = night ? 'rgba(170,200,255,0.5)' : 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 0.14;
  ctx.beginPath();
  for (let x = 0; x <= g.W; x += 1.5) {
    const yy = y + Math.sin(x * 0.45 + time * 1.6) * 0.18 + Math.sin(x * 0.17 - time) * 0.12;
    if (x === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
}
