import type { DecorDef } from '../../game/types';
import { alpha, mix, shade } from '../color';
import { hashString, mulberry32 } from '../../game/util';

// Dekorlar: statik kısım sprite olarak bir kez çizilir; hareketli kısımlar her karede.
// Birim: dünya birimi, orijin taban ortası (0,0), yukarı negatif y.

type R = () => number;

function rock(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rng: R, base: string) {
  const n = 9;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.78 + rng() * 0.3;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * (Math.sin(a) > 0 ? 0.55 : 1)]);
  }
  const g = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx * 0.6, cy + ry);
  g.addColorStop(0, shade(base, 0.25));
  g.addColorStop(0.55, base);
  g.addColorStop(1, shade(base, -0.45));
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    ctx.quadraticCurveTo(q[0], q[1], (q[0] + pts[(i + 2) % n][0]) / 2, (q[1] + pts[(i + 2) % n][1]) / 2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = alpha(shade(base, -0.6), 0.35);
  ctx.lineWidth = Math.max(0.08, rx * 0.03);
  ctx.stroke();
  // doku
  ctx.fillStyle = alpha(shade(base, -0.35), 0.35);
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(cx + (rng() - 0.5) * rx * 1.2, cy + (rng() - 0.5) * ry * 0.9, Math.max(0.08, rx * 0.05 * rng()), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.25, cy - ry * 0.45, rx * 0.35, ry * 0.18, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function shadowUnder(ctx: CanvasRenderingContext2D, w: number) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.55);
  g.addColorStop(0, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.save();
  ctx.scale(1, 0.18);
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Balkabağının oyulmuş yüzü (statik gölge ve dinamik ışık aynı yolu kullanır) */
function pumpkinFace(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cy = -H * 0.42;
  const ex = W * 0.17;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * ex - 0.75, cy - 0.35);
    ctx.lineTo(s * ex + 0.75, cy - 0.35);
    ctx.lineTo(s * ex + s * 0.15, cy - 1.45);
    ctx.closePath();
  }
  ctx.moveTo(-0.35, cy + 0.35);
  ctx.lineTo(0.35, cy + 0.35);
  ctx.lineTo(0, cy - 0.2);
  ctx.closePath();
  const mw = W * 0.3;
  const my = cy + 0.9;
  ctx.moveTo(-mw, my);
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const x = -mw + (i / n) * mw * 2;
    ctx.lineTo(x - mw / n, my + (i % 2 ? 0.55 : 0));
    ctx.lineTo(x, my);
  }
  ctx.quadraticCurveTo(0, my + 2.1, -mw, my);
  ctx.closePath();
}

/** Yılbaşı ağacındaki ışıkların sabit konumları */
function treeLights(W: number, H: number): { x: number; y: number; c: string }[] {
  const rng = mulberry32(4242);
  const cols = ['#f87171', '#fde047', '#60a5fa', '#4ade80', '#f0abfc'];
  const out: { x: number; y: number; c: string }[] = [];
  for (let i = 0; i < 16; i++) {
    const f = 0.12 + (i / 16) * 0.78; // aşağıdan yukarıya
    const half = W * 0.46 * (1 - f) + 0.4;
    out.push({ x: (rng() * 2 - 1) * half * 0.85, y: -2.2 - f * (H * 0.78 - 2.2), c: cols[i % cols.length] });
  }
  return out;
}

function woodGrad(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, c: string) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, shade(c, 0.15));
  g.addColorStop(1, shade(c, -0.35));
  return g;
}

export function drawDecorStatic(ctx: CanvasRenderingContext2D, def: DecorDef, seedKey: string) {
  const rng = mulberry32(hashString(seedKey));
  const W = def.w;
  const H = def.h;
  shadowUnder(ctx, W);
  switch (def.art) {
    case 'pebbles': {
      const cols = ['#8d8a84', '#a89f91', '#6f6a63', '#b8b0a2', '#7d756a'];
      for (let i = 0; i < 8; i++) {
        const x = (rng() - 0.5) * W * 0.85;
        const r = 0.8 + rng() * 1.3;
        rock(ctx, x, -r * 0.6, r, r * 0.75, rng, cols[i % cols.length]);
      }
      break;
    }
    case 'rockpile': {
      rock(ctx, -W * 0.22, -H * 0.35, W * 0.28, H * 0.42, rng, '#77736d');
      rock(ctx, W * 0.2, -H * 0.3, W * 0.3, H * 0.36, rng, '#86817a');
      rock(ctx, -W * 0.02, -H * 0.72, W * 0.22, H * 0.3, rng, '#9a948b');
      break;
    }
    case 'shells': {
      // tarak kabuğu
      ctx.save();
      ctx.translate(-W * 0.2, -1.2);
      ctx.fillStyle = '#f4c7a1';
      ctx.beginPath();
      ctx.moveTo(0, 1);
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        ctx.lineTo(Math.cos(a) * 2.4, Math.sin(a) * 2.2 + 0.2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d98e6a';
      ctx.lineWidth = 0.15;
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.lineTo(Math.cos(a) * 2.3, Math.sin(a) * 2.1 + 0.2);
        ctx.stroke();
      }
      ctx.restore();
      // sarmal kabuk
      ctx.save();
      ctx.translate(W * 0.22, -1);
      const g = ctx.createLinearGradient(-2, -2, 2, 1);
      g.addColorStop(0, '#fff4e6');
      g.addColorStop(1, '#c9a27e');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-2.4, 0.6);
      ctx.quadraticCurveTo(-1, -2.2, 2.4, -0.2);
      ctx.quadraticCurveTo(0.5, 1.2, -2.4, 0.6);
      ctx.fill();
      ctx.strokeStyle = '#a57e5a';
      ctx.lineWidth = 0.12;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-1.8 + i * 1, 0.5);
        ctx.quadraticCurveTo(-1.2 + i * 1, -0.8, -0.4 + i, -1.2 + i * 0.25);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'driftwood': {
      const c = '#6b4a2f';
      ctx.lineCap = 'round';
      const branch = (x0: number, y0: number, x1: number, y1: number, w: number) => {
        ctx.strokeStyle = woodGrad(ctx, x0, y0 - w, x0, y0 + w, c);
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2 + (rng() - 0.5) * 3, (y0 + y1) / 2 - 1, x1, y1);
        ctx.stroke();
      };
      branch(-W * 0.48, -1.2, W * 0.35, -H * 0.55, 2.6);
      branch(W * 0.35, -H * 0.55, W * 0.5, -H * 0.95, 1.3);
      branch(-W * 0.05, -H * 0.3, -W * 0.25, -H * 0.9, 1.5);
      branch(-W * 0.25, -H * 0.9, -W * 0.38, -H * 1.0, 0.8);
      branch(W * 0.1, -H * 0.42, W * 0.12, -H * 0.8, 1.0);
      ctx.strokeStyle = 'rgba(30,18,8,0.35)';
      ctx.lineWidth = 0.15;
      for (let i = 0; i < 10; i++) {
        const x = -W * 0.4 + i * W * 0.08;
        ctx.beginPath();
        ctx.moveTo(x, -1.5 - i * H * 0.045);
        ctx.lineTo(x + 1.5, -1.9 - i * H * 0.045);
        ctx.stroke();
      }
      break;
    }
    case 'cave': {
      rock(ctx, 0, -H * 0.48, W * 0.52, H * 0.56, rng, '#716b63');
      rock(ctx, -W * 0.3, -H * 0.25, W * 0.25, H * 0.3, rng, '#827b72');
      const hg = ctx.createRadialGradient(0, -H * 0.2, 0, 0, -H * 0.2, W * 0.25);
      hg.addColorStop(0, '#05080c');
      hg.addColorStop(0.7, '#141619');
      hg.addColorStop(1, 'rgba(20,22,25,0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.ellipse(W * 0.05, -H * 0.22, W * 0.22, H * 0.25, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(W * 0.27, 0);
      ctx.lineTo(-W * 0.17, 0);
      ctx.fill();
      break;
    }
    case 'slate': {
      const cols = ['#5d6670', '#6c7580', '#4f5760'];
      for (let i = 0; i < 3; i++) {
        const y = -1 - i * 2.1;
        const w = W * (0.95 - i * 0.18);
        const x = (rng() - 0.5) * 2;
        ctx.fillStyle = cols[i];
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y);
        ctx.lineTo(x - w / 2 + 1, y - 1.6);
        ctx.lineTo(x + w / 2 - 0.5, y - 1.8);
        ctx.lineTo(x + w / 2, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x - w / 2 + 1, y - 1.7, w - 1.6, 0.35);
      }
      break;
    }
    case 'chest': {
      const g = woodGrad(ctx, 0, -H * 0.6, 0, 0, '#7a4a22');
      ctx.fillStyle = g;
      ctx.fillRect(-W / 2, -H * 0.62, W, H * 0.62);
      ctx.fillStyle = '#c99a2e';
      ctx.fillRect(-W / 2, -H * 0.62, W, 0.6);
      ctx.fillRect(-W / 2 + 1.2, -H * 0.62, 0.8, H * 0.62);
      ctx.fillRect(W / 2 - 2, -H * 0.62, 0.8, H * 0.62);
      ctx.fillStyle = '#e8c35a';
      ctx.fillRect(-0.9, -H * 0.5, 1.8, 1.8);
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(-0.25, -H * 0.45, 0.5, 0.9);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.12;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-W / 2, -H * 0.62 + i * H * 0.15);
        ctx.lineTo(W / 2, -H * 0.62 + i * H * 0.15);
        ctx.stroke();
      }
      break;
    }
    case 'diver': {
      // botlar
      ctx.fillStyle = '#2d2a26';
      ctx.fillRect(-2.2, -1.2, 1.8, 1.2);
      ctx.fillRect(0.4, -1.2, 1.8, 1.2);
      // gövde (dalış giysisi)
      const sg = ctx.createLinearGradient(-3, 0, 3, 0);
      sg.addColorStop(0, '#6b5a3e');
      sg.addColorStop(0.5, '#a08a5f');
      sg.addColorStop(1, '#5b4b33');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-2.4, -1.2);
      ctx.lineTo(-2.8, -H * 0.62);
      ctx.lineTo(2.8, -H * 0.62);
      ctx.lineTo(2.4, -1.2);
      ctx.closePath();
      ctx.fill();
      // kollar
      ctx.strokeStyle = '#8c774f';
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2.6, -H * 0.58);
      ctx.lineTo(-3.3, -H * 0.4);
      ctx.moveTo(2.6, -H * 0.58);
      ctx.lineTo(3.4, -H * 0.42);
      ctx.stroke();
      // kask
      const hg = ctx.createRadialGradient(-0.8, -H * 0.82, 0.3, 0, -H * 0.76, 2.8);
      hg.addColorStop(0, '#ffe29a');
      hg.addColorStop(0.5, '#c8942f');
      hg.addColorStop(1, '#7a5415');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(0, -H * 0.77, 2.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b2f3a';
      ctx.beginPath();
      ctx.arc(0.6, -H * 0.77, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6420';
      ctx.lineWidth = 0.35;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(0.2, -H * 0.8, 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'castle': {
      const stone = '#9a948a';
      const g = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
      g.addColorStop(0, shade(stone, -0.2));
      g.addColorStop(0.4, shade(stone, 0.1));
      g.addColorStop(1, shade(stone, -0.35));
      const tower = (x: number, w: number, h: number) => {
        ctx.fillStyle = g;
        ctx.fillRect(x - w / 2, -h, w, h);
        for (let i = 0; i < 3; i++) ctx.fillRect(x - w / 2 + i * (w / 2.5), -h - 1, w / 5, 1);
        ctx.fillStyle = '#b0493b';
        ctx.beginPath();
        ctx.moveTo(x - w / 2 - 0.4, -h - 1);
        ctx.lineTo(x, -h - w * 0.9);
        ctx.lineTo(x + w / 2 + 0.4, -h - 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#12161a';
        ctx.beginPath();
        ctx.ellipse(x, -h * 0.72, w * 0.12, w * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      ctx.fillStyle = g;
      ctx.fillRect(-W * 0.32, -H * 0.5, W * 0.64, H * 0.5);
      tower(-W * 0.36, W * 0.24, H * 0.62);
      tower(W * 0.36, W * 0.24, H * 0.58);
      tower(0, W * 0.3, H * 0.72);
      ctx.fillStyle = '#0d1114';
      ctx.beginPath();
      ctx.moveTo(-W * 0.1, 0);
      ctx.lineTo(-W * 0.1, -H * 0.2);
      ctx.arc(0, -H * 0.2, W * 0.1, Math.PI, 0);
      ctx.lineTo(W * 0.1, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 0.12;
      for (let y = -1.5; y > -H * 0.5; y -= 1.6) {
        ctx.beginPath();
        ctx.moveTo(-W * 0.32, y);
        ctx.lineTo(W * 0.32, y);
        ctx.stroke();
      }
      break;
    }
    case 'ship': {
      ctx.save();
      ctx.rotate(-0.12);
      const hull = woodGrad(ctx, 0, -H * 0.6, 0, 0, '#6e4b2a');
      ctx.fillStyle = hull;
      ctx.beginPath();
      ctx.moveTo(-W * 0.5, -H * 0.45);
      ctx.lineTo(W * 0.42, -H * 0.5);
      ctx.quadraticCurveTo(W * 0.52, -H * 0.3, W * 0.38, 0.5);
      ctx.lineTo(-W * 0.4, 0.5);
      ctx.quadraticCurveTo(-W * 0.5, -H * 0.2, -W * 0.5, -H * 0.45);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 0.15;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-W * 0.48, -H * 0.45 + i * H * 0.1);
        ctx.lineTo(W * 0.45, -H * 0.5 + i * H * 0.11);
        ctx.stroke();
      }
      ctx.fillStyle = '#0e141a';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(-W * 0.3 + i * W * 0.18, -H * 0.3, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      // kırık delik
      ctx.beginPath();
      ctx.moveTo(W * 0.05, -H * 0.1);
      ctx.lineTo(W * 0.12, -H * 0.3);
      ctx.lineTo(W * 0.2, -H * 0.12);
      ctx.lineTo(W * 0.14, -H * 0.02);
      ctx.fill();
      // direk
      ctx.strokeStyle = '#5a3b1f';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-W * 0.05, -H * 0.48);
      ctx.lineTo(-W * 0.02, -H * 1.05);
      ctx.moveTo(-W * 0.12, -H * 0.85);
      ctx.lineTo(W * 0.08, -H * 0.87);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'volcano': {
      const g = ctx.createLinearGradient(-W / 2, 0, W / 2, -H);
      g.addColorStop(0, '#3b3530');
      g.addColorStop(0.6, '#5c5249');
      g.addColorStop(1, '#2a2521');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-W / 2, 0);
      ctx.quadraticCurveTo(-W * 0.25, -H * 0.4, -W * 0.14, -H);
      ctx.lineTo(W * 0.14, -H);
      ctx.quadraticCurveTo(W * 0.25, -H * 0.4, W / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-W * 0.06, -H);
      ctx.quadraticCurveTo(-W * 0.12, -H * 0.6, -W * 0.2, -H * 0.3);
      ctx.moveTo(W * 0.07, -H);
      ctx.quadraticCurveTo(W * 0.1, -H * 0.7, W * 0.18, -H * 0.45);
      ctx.stroke();
      break;
    }
    case 'bridge': {
      const stone = '#8d877d';
      ctx.fillStyle = woodGrad(ctx, 0, -H, 0, 0, stone);
      ctx.beginPath();
      ctx.moveTo(-W / 2, 0);
      ctx.lineTo(-W / 2, -H * 0.8);
      ctx.lineTo(W / 2, -H * 0.8);
      ctx.lineTo(W / 2, 0);
      ctx.lineTo(W * 0.3, 0);
      ctx.arc(0, 0, W * 0.3, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(stone, -0.3);
      ctx.fillRect(-W / 2, -H, W, H * 0.22);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.12;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * W * 0.13, -H * 0.8);
        ctx.lineTo(i * W * 0.13, -H);
        ctx.stroke();
      }
      break;
    }
    case 'columns': {
      const col = (x: number, h: number, broken: boolean) => {
        const g = ctx.createLinearGradient(x - 1.6, 0, x + 1.6, 0);
        g.addColorStop(0, '#b9b3a7');
        g.addColorStop(0.45, '#f1ece2');
        g.addColorStop(1, '#8f897e');
        ctx.fillStyle = g;
        ctx.fillRect(x - 1.5, -h, 3, h);
        ctx.fillStyle = '#d8d2c6';
        ctx.fillRect(x - 2, -1, 4, 1);
        if (!broken) ctx.fillRect(x - 2.1, -h - 0.8, 4.2, 0.8);
        else {
          ctx.fillStyle = '#b9b3a7';
          ctx.beginPath();
          ctx.moveTo(x - 1.5, -h);
          ctx.lineTo(x - 0.5, -h - 1.2);
          ctx.lineTo(x + 0.4, -h - 0.4);
          ctx.lineTo(x + 1.5, -h - 1);
          ctx.lineTo(x + 1.5, -h);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 0.12;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(x + i * 0.8, -1);
          ctx.lineTo(x + i * 0.8, -h);
          ctx.stroke();
        }
      };
      col(-W * 0.32, H * 0.95, false);
      col(0, H * 0.6, true);
      col(W * 0.32, H * 0.8, false);
      ctx.fillStyle = '#cfc9bd';
      ctx.save();
      ctx.translate(W * 0.12, -0.9);
      ctx.rotate(0.12);
      ctx.fillRect(-3, -0.9, 6.5, 1.8);
      ctx.restore();
      break;
    }
    case 'head': {
      const g = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
      g.addColorStop(0, '#5e5953');
      g.addColorStop(0.5, '#8a847b');
      g.addColorStop(1, '#4a4641');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-W * 0.42, 0);
      ctx.lineTo(-W * 0.4, -H * 0.75);
      ctx.quadraticCurveTo(-W * 0.35, -H, 0, -H);
      ctx.quadraticCurveTo(W * 0.4, -H, W * 0.42, -H * 0.75);
      ctx.lineTo(W * 0.45, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-W * 0.35, -H * 0.66, W * 0.7, H * 0.06);
      ctx.fillStyle = shade('#8a847b', 0.1);
      ctx.beginPath();
      ctx.moveTo(-W * 0.05, -H * 0.62);
      ctx.lineTo(W * 0.14, -H * 0.3);
      ctx.lineTo(-W * 0.08, -H * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-W * 0.2, -H * 0.2, W * 0.4, H * 0.04);
      break;
    }
    case 'amphora': {
      ctx.save();
      ctx.translate(0, -H * 0.42);
      ctx.rotate(-1.35);
      const g = ctx.createLinearGradient(-3, 0, 3, 0);
      g.addColorStop(0, '#8a4a25');
      g.addColorStop(0.5, '#c8763f');
      g.addColorStop(1, '#6d3a1d');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-1, -5.5);
      ctx.lineTo(1, -5.5);
      ctx.quadraticCurveTo(1.2, -3.5, 3.2, -2);
      ctx.quadraticCurveTo(3.8, 2, 0, 5.5);
      ctx.quadraticCurveTo(-3.8, 2, -3.2, -2);
      ctx.quadraticCurveTo(-1.2, -3.5, -1, -5.5);
      ctx.fill();
      ctx.strokeStyle = '#6d3a1d';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-1, -4.8);
      ctx.quadraticCurveTo(-3, -4.5, -2.8, -2.4);
      ctx.moveTo(1, -4.8);
      ctx.quadraticCurveTo(3, -4.5, 2.8, -2.4);
      ctx.stroke();
      ctx.strokeStyle = '#e0b07a';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(-3.4, 0);
      ctx.quadraticCurveTo(0, 0.8, 3.4, 0);
      ctx.stroke();
      ctx.fillStyle = '#1a0f08';
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 1, 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'crystal': {
      const cols = ['#a78bfa', '#67e8f9', '#c4b5fd', '#22d3ee', '#818cf8'];
      rock(ctx, 0, -1.2, W * 0.45, 1.8, rng, '#4b4458');
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * W * 0.11 + (rng() - 0.5);
        const h = H * (0.45 + rng() * 0.55) * (1 - Math.abs(i - 3) * 0.12);
        const w = 1.1 + rng() * 0.8;
        const ang = (i - 3) * 0.12;
        ctx.save();
        ctx.translate(x, -1);
        ctx.rotate(ang);
        const c = cols[i % cols.length];
        const g = ctx.createLinearGradient(-w, 0, w, 0);
        g.addColorStop(0, shade(c, -0.3));
        g.addColorStop(0.5, shade(c, 0.35));
        g.addColorStop(1, shade(c, -0.1));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-w, 0);
        ctx.lineTo(-w, -h);
        ctx.lineTo(0, -h - w * 1.2);
        ctx.lineTo(w, -h);
        ctx.lineTo(w, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 0.12;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -h - w * 1.2);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'lighthouse': {
      rock(ctx, 0, -1.5, W * 0.55, 2.2, rng, '#6f6a63');
      const top = -H * 0.8;
      for (let i = 0; i < 5; i++) {
        const y0 = -2 - i * ((H * 0.8 - 2) / 5);
        const y1 = y0 - (H * 0.8 - 2) / 5;
        const w0 = W * 0.36 - i * 0.35;
        const w1 = w0 - 0.35;
        ctx.fillStyle = i % 2 ? '#f5f1e8' : '#c0392b';
        ctx.beginPath();
        ctx.moveTo(-w0 / 2, y0);
        ctx.lineTo(-w1 / 2, y1);
        ctx.lineTo(w1 / 2, y1);
        ctx.lineTo(w0 / 2, y0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, top, W * 0.18, H * 0.8 - 2);
      ctx.fillStyle = '#2b2b2b';
      ctx.fillRect(-W * 0.25, top - 0.4, W * 0.5, 0.5);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(-W * 0.14, top - 2.4, W * 0.28, 2);
      ctx.fillStyle = '#b3261e';
      ctx.beginPath();
      ctx.moveTo(-W * 0.2, top - 2.4);
      ctx.lineTo(0, top - 4.2);
      ctx.lineTo(W * 0.2, top - 2.4);
      ctx.fill();
      break;
    }
    case 'clam': {
      // alt kabuk
      const g = ctx.createLinearGradient(0, -H, 0, 0);
      g.addColorStop(0, '#e9e4da');
      g.addColorStop(1, '#8f8778');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-W / 2, -H * 0.3);
      for (let i = 0; i <= 10; i++) {
        const x = -W / 2 + (i / 10) * W;
        ctx.lineTo(x, -H * 0.3 + (i % 2 ? 0.6 : -0.3));
      }
      ctx.quadraticCurveTo(W * 0.45, 0, 0, 0);
      ctx.quadraticCurveTo(-W * 0.45, 0, -W / 2, -H * 0.3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.15;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(-W / 2 + (i / 6) * W, -H * 0.3);
        ctx.lineTo(0, 0);
        ctx.stroke();
      }
      break;
    }
    case 'temple': {
      const marble = '#e9e2d0';
      ctx.fillStyle = shade(marble, -0.2);
      ctx.fillRect(-W / 2, -1.5, W, 1.5);
      ctx.fillStyle = shade(marble, -0.1);
      ctx.fillRect(-W * 0.46, -2.7, W * 0.92, 1.2);
      for (let i = 0; i < 5; i++) {
        const x = -W * 0.38 + i * W * 0.19;
        const h = i === 3 ? H * 0.42 : H * 0.62;
        const g = ctx.createLinearGradient(x - 1.2, 0, x + 1.2, 0);
        g.addColorStop(0, shade(marble, -0.2));
        g.addColorStop(0.5, marble);
        g.addColorStop(1, shade(marble, -0.35));
        ctx.fillStyle = g;
        ctx.fillRect(x - 1.1, -2.7 - h, 2.2, h);
      }
      ctx.fillStyle = marble;
      ctx.fillRect(-W * 0.48, -2.7 - H * 0.62 - 1.4, W * 0.62, 1.4);
      ctx.fillStyle = '#e8b923';
      ctx.fillRect(-W * 0.48, -2.7 - H * 0.62 - 1.6, W * 0.62, 0.3);
      ctx.fillStyle = marble;
      ctx.beginPath();
      ctx.moveTo(-W * 0.48, -2.7 - H * 0.62 - 1.4);
      ctx.lineTo(-W * 0.17, -H * 0.98);
      ctx.lineTo(W * 0.14, -2.7 - H * 0.62 - 1.4);
      ctx.fill();
      ctx.fillStyle = '#e8b923';
      ctx.beginPath();
      ctx.arc(-W * 0.17, -H * 0.86, 1.1, 0, Math.PI * 2);
      ctx.fill();
      // devrilmiş parça
      ctx.save();
      ctx.translate(W * 0.33, -1.8);
      ctx.rotate(0.3);
      ctx.fillStyle = shade(marble, -0.15);
      ctx.fillRect(-4, -1, 8, 2);
      ctx.restore();
      break;
    }
    case 'dragon': {
      const gold = (x0: number, y0: number, x1: number, y1: number) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, '#fff1a8');
        g.addColorStop(0.4, '#e8b923');
        g.addColorStop(1, '#8a6410');
        return g;
      };
      rock(ctx, 0, -1.4, W * 0.5, 2, rng, '#4f4a45');
      ctx.strokeStyle = gold(-W / 2, -H, W / 2, 0);
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-W * 0.4, -2.2);
      ctx.bezierCurveTo(-W * 0.2, -H * 0.9, W * 0.1, -H * 0.1, W * 0.25, -H * 0.6);
      ctx.bezierCurveTo(W * 0.32, -H * 0.8, W * 0.2, -H * 0.9, W * 0.12, -H * 0.82);
      ctx.stroke();
      // pullar
      ctx.fillStyle = 'rgba(120,80,10,0.35)';
      for (let i = 0; i < 14; i++) {
        const t = i / 14;
        const x = -W * 0.4 + t * W * 0.62;
        const y = -2.2 - Math.sin(t * Math.PI) * H * 0.35;
        ctx.beginPath();
        ctx.arc(x, y, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // baş
      ctx.fillStyle = gold(W * 0.05, -H, W * 0.3, -H * 0.6);
      ctx.beginPath();
      ctx.ellipse(W * 0.1, -H * 0.84, 2.4, 1.6, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(W * 0.1 + 1.5, -H * 0.84);
      ctx.lineTo(W * 0.1 + 4, -H * 0.8);
      ctx.lineTo(W * 0.1 + 1.6, -H * 0.72);
      ctx.fill();
      ctx.strokeStyle = '#8a6410';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(W * 0.05, -H * 0.9);
      ctx.lineTo(W * 0.0, -H * 1.02);
      ctx.moveTo(W * 0.1, -H * 0.92);
      ctx.lineTo(W * 0.08, -H * 1.04);
      ctx.stroke();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(W * 0.12, -H * 0.86, 0.35, 0, Math.PI * 2);
      ctx.fill();
      // inci
      ctx.fillStyle = '#fdfcf7';
      ctx.beginPath();
      ctx.arc(W * 0.1 + 4.6, -H * 0.8, 0.9, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'palace': {
      const glass = (x: number, w: number, h: number, c: string) => {
        const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        g.addColorStop(0, alpha(shade(c, -0.2), 0.85));
        g.addColorStop(0.5, alpha(shade(c, 0.45), 0.9));
        g.addColorStop(1, alpha(shade(c, -0.1), 0.85));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, 0);
        ctx.lineTo(x - w / 2, -h);
        ctx.lineTo(x, -h - w);
        ctx.lineTo(x + w / 2, -h);
        ctx.lineTo(x + w / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 0.15;
        ctx.stroke();
      };
      glass(-W * 0.32, W * 0.2, H * 0.45, '#67e8f9');
      glass(W * 0.32, W * 0.2, H * 0.5, '#a5b4fc');
      glass(-W * 0.12, W * 0.22, H * 0.62, '#c4b5fd');
      glass(W * 0.12, W * 0.22, H * 0.58, '#67e8f9');
      glass(0, W * 0.26, H * 0.72, '#e0f2fe');
      ctx.fillStyle = '#e8b923';
      ctx.fillRect(-W * 0.45, -1, W * 0.9, 1);
      break;
    }
    case 'liverock': {
      rock(ctx, -W * 0.15, -H * 0.4, W * 0.35, H * 0.45, rng, '#8b7d6b');
      rock(ctx, W * 0.2, -H * 0.3, W * 0.3, H * 0.35, rng, '#9a8b76');
      ctx.fillStyle = 'rgba(190,80,200,0.55)';
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.ellipse((rng() - 0.5) * W * 0.8, -rng() * H * 0.8, 0.8 + rng(), 0.5 + rng() * 0.5, rng(), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(20,15,10,0.45)';
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.arc((rng() - 0.5) * W * 0.8, -rng() * H * 0.7, 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'arch': {
      const c = '#8b7f6e';
      ctx.fillStyle = woodGrad(ctx, 0, -H, 0, 0, c);
      ctx.beginPath();
      ctx.moveTo(-W / 2, 0);
      ctx.quadraticCurveTo(-W * 0.5, -H * 0.9, -W * 0.1, -H);
      ctx.quadraticCurveTo(W * 0.4, -H * 1.05, W / 2, 0);
      ctx.lineTo(W * 0.28, 0);
      ctx.quadraticCurveTo(W * 0.2, -H * 0.62, -W * 0.05, -H * 0.62);
      ctx.quadraticCurveTo(-W * 0.28, -H * 0.55, -W * 0.3, 0);
      ctx.closePath();
      ctx.fill();
      const coral = ['#f472b6', '#fb923c', '#a78bfa', '#34d399', '#facc15'];
      for (let i = 0; i < 14; i++) {
        const t = i / 13;
        const x = -W * 0.45 + t * W * 0.9;
        const y = -H * (0.75 + Math.sin(t * Math.PI) * 0.27) + rng() * 1.5;
        ctx.fillStyle = coral[i % coral.length];
        ctx.beginPath();
        ctx.arc(x, y, 0.6 + rng() * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'anchor': {
      ctx.strokeStyle = '#4a3f38';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -H * 0.9);
      ctx.lineTo(0, -1.5);
      ctx.moveTo(-W * 0.4, -H * 0.3);
      ctx.quadraticCurveTo(-W * 0.35, -0.6, 0, -1);
      ctx.quadraticCurveTo(W * 0.35, -0.6, W * 0.4, -H * 0.3);
      ctx.moveTo(-W * 0.25, -H * 0.75);
      ctx.lineTo(W * 0.25, -H * 0.75);
      ctx.stroke();
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(0, -H * 0.95, 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(160,82,45,0.5)';
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.arc((rng() - 0.5) * W * 0.6, -rng() * H * 0.9, 0.25 + rng() * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#5a4d44';
      ctx.lineWidth = 0.3;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(1.2 + i * 1.1, -H * 0.95 + i * 1.8, 0.5, 0.8, 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'flowerPot': {
      const pw = W * 0.62;
      const ph = H * 0.4;
      const rimY = -ph - 1.1;
      const tulip = (i: number) => {
        const cols = ['#e11d48', '#f472b6', '#facc15', '#fb7185', '#f97316'];
        const x0 = (i - 2) * pw * 0.19;
        const lean = (i - 2) * 0.55 + (rng() - 0.5) * 0.5;
        const top = rimY - H * (0.34 + rng() * 0.16) + Math.abs(i - 2) * 0.6;
        ctx.strokeStyle = '#3f8f3a';
        ctx.lineWidth = 0.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, rimY);
        ctx.quadraticCurveTo(x0 + lean * 0.2, (top + rimY) / 2, x0 + lean, top);
        ctx.stroke();
        if (i % 2 === 0) {
          const d = i < 2 ? -1 : 1;
          ctx.fillStyle = '#4caf50';
          ctx.beginPath();
          ctx.moveTo(x0, rimY);
          ctx.quadraticCurveTo(x0 + d * 1.9, rimY - 1.6, x0 + d * 0.8, rimY - 4.2);
          ctx.quadraticCurveTo(x0 + d * 0.2, rimY - 2, x0, rimY);
          ctx.fill();
        }
        const c = cols[i];
        const fx = x0 + lean;
        const fy = top;
        const fg = ctx.createLinearGradient(fx - 1, 0, fx + 1, 0);
        fg.addColorStop(0, shade(c, -0.3));
        fg.addColorStop(0.5, shade(c, 0.25));
        fg.addColorStop(1, shade(c, -0.35));
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(fx - 0.95, fy - 1.4);
        ctx.lineTo(fx - 0.45, fy - 0.7);
        ctx.lineTo(fx, fy - 1.6);
        ctx.lineTo(fx + 0.45, fy - 0.7);
        ctx.lineTo(fx + 0.95, fy - 1.4);
        ctx.quadraticCurveTo(fx + 1.05, fy + 0.35, fx, fy + 0.4);
        ctx.quadraticCurveTo(fx - 1.05, fy + 0.35, fx - 0.95, fy - 1.4);
        ctx.fill();
      };
      for (const i of [0, 4, 1, 3, 2]) tulip(i);
      const g = ctx.createLinearGradient(-pw / 2, 0, pw / 2, 0);
      g.addColorStop(0, '#8a3f1f');
      g.addColorStop(0.4, '#d7773f');
      g.addColorStop(1, '#7a3519');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-pw * 0.36, 0);
      ctx.lineTo(-pw / 2, -ph);
      ctx.lineTo(pw / 2, -ph);
      ctx.lineTo(pw * 0.36, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c4622f';
      ctx.fillRect(-pw * 0.56, rimY, pw * 1.12, 1.15);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(-pw * 0.56, rimY, pw * 1.12, 0.28);
      ctx.fillStyle = 'rgba(255,240,220,0.55)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-pw * 0.22 + i * pw * 0.22, -ph * 0.5, 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'pagoda': {
      // yanındaki kiraz ağacı (arkada)
      ctx.strokeStyle = '#5b3a29';
      ctx.lineCap = 'round';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(W * 0.36, 0);
      ctx.quadraticCurveTo(W * 0.44, -H * 0.3, W * 0.3, -H * 0.56);
      ctx.moveTo(W * 0.4, -H * 0.28);
      ctx.quadraticCurveTo(W * 0.52, -H * 0.4, W * 0.5, -H * 0.5);
      ctx.stroke();
      for (let i = 0; i < 26; i++) {
        const a = rng() * Math.PI * 2;
        const r = rng() * 2.6;
        const cx = (i % 2 ? W * 0.32 : W * 0.48) + Math.cos(a) * r;
        const cy = (i % 2 ? -H * 0.59 : -H * 0.5) + Math.sin(a) * r * 0.7;
        ctx.fillStyle = rng() < 0.5 ? '#f9a8d4' : '#fbcfe8';
        ctx.beginPath();
        ctx.arc(cx, cy, 0.5 + rng() * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      rock(ctx, 0, -0.8, W * 0.46, 1.4, rng, '#77736b');
      ctx.fillStyle = '#8d8779';
      ctx.fillRect(-W * 0.38, -2.6, W * 0.76, 1.7);
      let y = -2.6;
      for (let i = 0; i < 3; i++) {
        const bw = W * (0.46 - i * 0.09);
        const bh = H * 0.15;
        const wg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
        wg.addColorStop(0, '#7f1d1d');
        wg.addColorStop(0.5, '#dc2626');
        wg.addColorStop(1, '#6b1515');
        ctx.fillStyle = wg;
        ctx.fillRect(-bw / 2, y - bh, bw, bh);
        ctx.fillStyle = '#1c1210';
        const dw = bw * 0.3;
        ctx.fillRect(-dw / 2, y - bh * 0.88, dw, bh * 0.78);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-dw / 2, y - bh * 0.5, dw, 0.14);
        ctx.fillRect(-0.07, y - bh * 0.88, 0.14, bh * 0.78);
        y -= bh;
        const rw = bw * 1.6;
        const rh = H * 0.075;
        const rg = ctx.createLinearGradient(0, y - rh, 0, y + 0.4);
        rg.addColorStop(0, '#2a7a74');
        rg.addColorStop(1, '#0f3b39');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(-rw / 2, y - 1);
        ctx.quadraticCurveTo(-rw * 0.3, y + 0.35, -rw * 0.15, y + 0.3);
        ctx.lineTo(rw * 0.15, y + 0.3);
        ctx.quadraticCurveTo(rw * 0.3, y + 0.35, rw / 2, y - 1);
        ctx.lineTo(bw * 0.3, y - rh);
        ctx.lineTo(-bw * 0.3, y - rh);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(-rw / 2, y - 1, 0.28, 0, Math.PI * 2);
        ctx.arc(rw / 2, y - 1, 0.28, 0, Math.PI * 2);
        ctx.fill();
        y -= rh;
      }
      ctx.strokeStyle = '#d4a017';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(0, y - H * 0.13);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      for (let k = 1; k <= 3; k++) ctx.fillRect(-0.45 + k * 0.08, y - k * H * 0.03, 0.9 - k * 0.16, 0.22);
      ctx.beginPath();
      ctx.arc(0, y - H * 0.13, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sandcastle': {
      const sand = '#e2c07f';
      ctx.fillStyle = shade(sand, -0.12);
      ctx.beginPath();
      ctx.ellipse(0, 0, W * 0.5, 2.2, 0, Math.PI, 0);
      ctx.fill();
      const tower = (cx: number, bw: number, h: number) => {
        const g = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
        g.addColorStop(0, shade(sand, 0.18));
        g.addColorStop(0.6, sand);
        g.addColorStop(1, shade(sand, -0.3));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx - bw / 2, -0.8);
        ctx.lineTo(cx - bw * 0.42, -0.8 - h);
        ctx.lineTo(cx + bw * 0.42, -0.8 - h);
        ctx.lineTo(cx + bw / 2, -0.8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = alpha(shade(sand, -0.4), 0.45);
        ctx.lineWidth = 0.14;
        for (let k = 1; k < 4; k++) {
          const yy = -0.8 - (h * k) / 4;
          const hw = bw / 2 - (bw * 0.08 * k) / 4;
          ctx.beginPath();
          ctx.moveTo(cx - hw, yy);
          ctx.lineTo(cx + hw, yy);
          ctx.stroke();
        }
        const n = 3;
        const cw = (bw * 0.84) / (n * 2 - 1);
        ctx.fillStyle = shade(sand, 0.06);
        for (let k = 0; k < n; k++) ctx.fillRect(cx - bw * 0.42 + k * 2 * cw, -0.8 - h - 0.9, cw, 0.95);
      };
      tower(-W * 0.34, W * 0.24, H * 0.46);
      tower(W * 0.34, W * 0.24, H * 0.46);
      tower(0, W * 0.36, H * 0.64);
      ctx.fillStyle = '#6b5230';
      ctx.beginPath();
      ctx.moveTo(-1, -0.8);
      ctx.lineTo(-1, -2.9);
      ctx.arc(0, -2.9, 1, Math.PI, 0);
      ctx.lineTo(1, -0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-W * 0.36, -H * 0.36, 0.7, 1);
      ctx.fillRect(W * 0.32, -H * 0.36, 0.7, 1);
      const shell = (x: number, y: number, c: string) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(x, y + 0.35);
        ctx.arc(x, y + 0.35, 0.7, Math.PI * 1.1, Math.PI * 1.9);
        ctx.closePath();
        ctx.fill();
      };
      shell(-W * 0.2, -H * 0.48, '#fbcfe8');
      shell(W * 0.14, -H * 0.3, '#fff7ed');
      shell(-W * 0.4, -1.4, '#fde68a');
      ctx.strokeStyle = '#6b4f2a';
      ctx.lineWidth = 0.18;
      ctx.beginPath();
      ctx.moveTo(0, -0.8 - H * 0.64 - 0.9);
      ctx.lineTo(0, -H * 0.97);
      ctx.stroke();
      break;
    }
    case 'tiki': {
      rock(ctx, 0, -0.7, W * 0.5, 1.2, rng, '#6f6a63');
      for (const s of [-1, 1]) {
        const x = s * W * 0.47;
        ctx.strokeStyle = '#c8a24a';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(x, -0.6);
        ctx.lineTo(x, -H * 0.6);
        ctx.stroke();
        ctx.strokeStyle = '#8a6d2a';
        ctx.lineWidth = 0.12;
        for (let k = 1; k < 5; k++) {
          ctx.beginPath();
          ctx.moveTo(x - 0.3, -0.6 - k * H * 0.11);
          ctx.lineTo(x + 0.3, -0.6 - k * H * 0.11);
          ctx.stroke();
        }
        ctx.fillStyle = '#3b2a18';
        ctx.beginPath();
        ctx.moveTo(x - 0.8, -H * 0.6);
        ctx.lineTo(x + 0.8, -H * 0.6);
        ctx.lineTo(x + 0.4, -H * 0.6 + 0.8);
        ctx.lineTo(x - 0.4, -H * 0.6 + 0.8);
        ctx.closePath();
        ctx.fill();
      }
      const bw = W * 0.5;
      const top = -H * 0.8;
      ctx.fillStyle = '#2f7d32';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.42;
        ctx.save();
        ctx.translate(0, top + 0.4);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, -2, 0.55, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const wg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
      wg.addColorStop(0, '#6b3f1d');
      wg.addColorStop(0.45, '#a86b36');
      wg.addColorStop(1, '#4a2a12');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.moveTo(-bw / 2, -0.6);
      ctx.lineTo(-bw / 2, top + 1.2);
      ctx.quadraticCurveTo(-bw / 2, top, 0, top);
      ctx.quadraticCurveTo(bw / 2, top, bw / 2, top + 1.2);
      ctx.lineTo(bw / 2, -0.6);
      ctx.closePath();
      ctx.fill();
      const fy = top + H * 0.17;
      ctx.fillStyle = '#4a2a12';
      ctx.fillRect(-bw * 0.42, fy - 1.6, bw * 0.84, 0.45);
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#f5deb3';
        ctx.beginPath();
        ctx.ellipse(s * bw * 0.22, fy, 0.95, 1.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22140a';
        ctx.beginPath();
        ctx.ellipse(s * bw * 0.22, fy + 0.1, 0.55, 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#5a3417';
      ctx.beginPath();
      ctx.moveTo(0, fy - 0.4);
      ctx.lineTo(0.8, fy + 2);
      ctx.lineTo(-0.8, fy + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#22140a';
      ctx.fillRect(-bw * 0.32, fy + 2.8, bw * 0.64, 1.7);
      ctx.fillStyle = '#f5deb3';
      for (let k = 0; k < 5; k++) ctx.fillRect(-bw * 0.3 + k * bw * 0.13, fy + 2.8, bw * 0.08, 0.55);
      ctx.strokeStyle = '#4a2a12';
      ctx.lineWidth = 0.25;
      for (let k = 0; k < 3; k++) {
        const yy = fy + 5.6 + k * 1.2;
        ctx.beginPath();
        ctx.moveTo(-bw / 2, yy);
        ctx.quadraticCurveTo(0, yy + 0.6, bw / 2, yy);
        ctx.stroke();
      }
      break;
    }
    case 'pumpkin': {
      const cy = -H * 0.42;
      const rx = W * 0.46;
      const ry = H * 0.42;
      for (const l of [-0.62, 0.62, -0.3, 0.3, 0]) {
        const lx = l * rx * 0.95;
        const lrx = rx * (0.38 + (1 - Math.abs(l)) * 0.16);
        const g = ctx.createRadialGradient(lx - lrx * 0.3, cy - ry * 0.35, 0.2, lx, cy, lrx * 1.15);
        g.addColorStop(0, '#ffb347');
        g.addColorStop(0.65, '#f97316');
        g.addColorStop(1, '#b8420c');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(lx, cy, lrx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#4d7c0f';
      ctx.beginPath();
      ctx.moveTo(-0.45, cy - ry + 0.35);
      ctx.quadraticCurveTo(-0.3, cy - ry - 1.2, 0.9, cy - ry - 1.7);
      ctx.lineTo(1.1, cy - ry - 1.2);
      ctx.quadraticCurveTo(0.35, cy - ry - 0.8, 0.45, cy - ry + 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3b1a06';
      pumpkinFace(ctx, W, H);
      ctx.fill();
      break;
    }
    case 'cauldron': {
      ctx.fillStyle = '#1f1f24';
      for (const x of [-W * 0.3, W * 0.3]) {
        ctx.beginPath();
        ctx.moveTo(x - 0.5, -H * 0.2);
        ctx.lineTo(x + 0.5, -H * 0.2);
        ctx.lineTo(x + (x > 0 ? 0.9 : -0.1), 0);
        ctx.lineTo(x + (x > 0 ? 0.1 : -0.9), 0);
        ctx.closePath();
        ctx.fill();
      }
      const cy = -H * 0.46;
      const rx = W * 0.44;
      const ry = H * 0.38;
      const g = ctx.createRadialGradient(-rx * 0.35, cy - ry * 0.3, 0.3, 0, cy, rx * 1.1);
      g.addColorStop(0, '#5b5b66');
      g.addColorStop(0.45, '#26262e');
      g.addColorStop(1, '#0b0b10');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      const rimY = cy - ry * 0.74;
      ctx.fillStyle = '#2d2d35';
      ctx.beginPath();
      ctx.ellipse(0, rimY, rx * 0.88, 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#70707e';
      ctx.lineWidth = 0.25;
      ctx.stroke();
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.ellipse(0, rimY + 0.05, rx * 0.74, 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.moveTo(rx * 0.42, rimY + 0.5);
      ctx.quadraticCurveTo(rx * 0.62, rimY + 1.4, rx * 0.5, rimY + 2.6);
      ctx.arc(rx * 0.5, rimY + 2.6, 0.32, 0, Math.PI);
      ctx.quadraticCurveTo(rx * 0.4, rimY + 1.4, rx * 0.2, rimY + 0.6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'snowman': {
      const snow = (x: number, y: number, r: number) => {
        const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.6, '#eef6ff');
        g.addColorStop(1, '#b3c8e0');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      };
      const r1 = W * 0.36;
      const r2 = r1 * 0.74;
      const r3 = r1 * 0.52;
      const y1 = -r1 * 0.92;
      const y2 = y1 - r1 * 0.78 - r2 * 0.72;
      const y3 = y2 - r2 * 0.78 - r3 * 0.78;
      ctx.strokeStyle = '#6b4423';
      ctx.lineWidth = 0.3;
      ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * r2 * 0.7, y2);
        ctx.lineTo(s * (r2 + 2.4), y2 - 1.9);
        ctx.moveTo(s * (r2 + 1.6), y2 - 1.3);
        ctx.lineTo(s * (r2 + 1.9), y2 - 2.4);
        ctx.stroke();
      }
      snow(0, y1, r1);
      snow(0, y2, r2);
      snow(0, y3, r3);
      ctx.fillStyle = '#1f2937';
      for (const yy of [y2 - r2 * 0.35, y2 + r2 * 0.15, y1 - r1 * 0.35]) {
        ctx.beginPath();
        ctx.arc(0, yy, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s * r3 * 0.35, y3 - r3 * 0.2, 0.24, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.arc(-r3 * 0.4 + k * r3 * 0.2, y3 + r3 * 0.42 + Math.sin((k / 4) * Math.PI) * 0.25, 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(0.05, y3 - 0.05);
      ctx.lineTo(r3 * 1.25, y3 + 0.3);
      ctx.lineTo(0.05, y3 + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-r3 * 1.05, y3 + r3 * 0.72, r3 * 2.1, 0.8);
      ctx.fillRect(r3 * 0.3, y3 + r3 * 0.72, 0.8, 2.4);
      ctx.fillStyle = '#fef2f2';
      ctx.fillRect(-r3 * 0.6, y3 + r3 * 0.72, 0.3, 0.8);
      ctx.fillRect(r3 * 0.2, y3 + r3 * 0.72, 0.3, 0.8);
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.ellipse(0, y3 - r3 * 0.78, r3 * 1.15, 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-r3 * 0.7, y3 - r3 * 0.78 - 2.1, r3 * 1.4, 2.1);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-r3 * 0.7, y3 - r3 * 0.78 - 0.75, r3 * 1.4, 0.4);
      break;
    }
    case 'giftTree': {
      ctx.fillStyle = '#5b3a29';
      ctx.fillRect(-0.7, -2.4, 1.4, 2.4);
      const layers = 4;
      const base = -2.2;
      const topY = -H * 0.8;
      for (let i = 0; i < layers; i++) {
        const y0 = base + ((topY - base) * i) / layers;
        const y1 = base + ((topY - base) * (i + 1.35)) / layers;
        const hw = W * 0.47 * (1 - i / (layers + 0.6));
        const g = ctx.createLinearGradient(-hw, 0, hw, 0);
        g.addColorStop(0, '#14532d');
        g.addColorStop(0.45, '#22883e');
        g.addColorStop(1, '#0f3d22');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-hw, y0);
        ctx.quadraticCurveTo(0, y0 + 0.9, hw, y0);
        ctx.lineTo(0, Math.max(y1, topY));
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(253,224,71,0.8)';
      ctx.lineWidth = 0.18;
      for (let i = 0; i < 3; i++) {
        const y = base + (topY - base) * (0.2 + i * 0.25);
        const hw = W * 0.4 * (1 - (0.2 + i * 0.25));
        ctx.beginPath();
        ctx.moveTo(-hw, y - 0.6);
        ctx.quadraticCurveTo(0, y + 0.9, hw, y - 1.2);
        ctx.stroke();
      }
      for (const L of treeLights(W, H)) {
        ctx.fillStyle = shade(L.c, -0.25);
        ctx.beginPath();
        ctx.arc(L.x, L.y, 0.36, 0, Math.PI * 2);
        ctx.fill();
      }
      const sy = topY - 0.6;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const r = k % 2 ? 0.55 : 1.3;
        ctx.lineTo(Math.cos(a) * r, sy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      const gift = (x: number, w: number, h: number, c: string, rib: string) => {
        ctx.fillStyle = c;
        ctx.fillRect(x - w / 2, -h, w, h);
        ctx.fillStyle = rib;
        ctx.fillRect(x - 0.18, -h, 0.36, h);
        ctx.fillRect(x - w / 2, -h * 0.6, w, 0.3);
        ctx.beginPath();
        ctx.ellipse(x - 0.45, -h - 0.25, 0.5, 0.28, -0.4, 0, Math.PI * 2);
        ctx.ellipse(x + 0.45, -h - 0.25, 0.5, 0.28, 0.4, 0, Math.PI * 2);
        ctx.fill();
      };
      gift(-W * 0.3, 2.6, 2.2, '#dc2626', '#fde047');
      gift(W * 0.32, 2.2, 1.7, '#2563eb', '#f8fafc');
      gift(W * 0.08, 1.8, 1.3, '#16a34a', '#fca5a5');
      break;
    }
  }
}

export interface DecorDynOpts {
  time: number;
  night: boolean;
  pearlReady: boolean;
  seed: number;
}

/** Hareketli parçalar (kapak, ışık, parıltı) */
export function drawDecorDynamic(ctx: CanvasRenderingContext2D, def: DecorDef, o: DecorDynOpts) {
  const W = def.w;
  const H = def.h;
  const t = o.time + o.seed * 7;
  switch (def.art) {
    case 'chest': {
      const cyc = t % 9;
      const open = cyc < 2.5 ? Math.sin(Math.min(1, cyc / 0.6) * Math.PI * 0.5) * (cyc > 2 ? (2.5 - cyc) / 0.5 : 1) : 0;
      ctx.save();
      ctx.translate(W / 2, -H * 0.62);
      ctx.rotate(-open * 0.9);
      ctx.translate(-W / 2, 0);
      ctx.fillStyle = woodGrad(ctx, 0, -H * 0.4, 0, 0, '#8a5427');
      ctx.beginPath();
      ctx.moveTo(-W / 2, 0);
      ctx.quadraticCurveTo(-W / 2, -H * 0.42, 0, -H * 0.42);
      ctx.quadraticCurveTo(W / 2, -H * 0.42, W / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c99a2e';
      ctx.fillRect(-W / 2 + 1.2, -H * 0.4, 0.8, H * 0.4);
      ctx.fillRect(W / 2 - 2, -H * 0.4, 0.8, H * 0.4);
      ctx.restore();
      if (open > 0.2) {
        ctx.fillStyle = alpha('#ffd54f', 0.6 * open);
        ctx.beginPath();
        ctx.ellipse(0, -H * 0.62, W * 0.35, 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'volcano': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2);
      const g = ctx.createRadialGradient(0, -H, 0, 0, -H, W * 0.35);
      g.addColorStop(0, alpha('#ffb347', 0.8 * pulse + 0.2));
      g.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -H, W * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lighthouse': {
      const top = -H * 0.8 - 1.4;
      const a = (t * 0.8) % (Math.PI * 2);
      const dir = Math.cos(a);
      const len = 22 * Math.abs(dir);
      const g = ctx.createLinearGradient(0, top, dir * len, top);
      g.addColorStop(0, 'rgba(255,245,190,0.55)');
      g.addColorStop(1, 'rgba(255,245,190,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, top - 0.5);
      ctx.lineTo(dir * len, top - 3);
      ctx.lineTo(dir * len, top + 3);
      ctx.lineTo(0, top + 0.5);
      ctx.fill();
      break;
    }
    case 'crystal':
    case 'palace': {
      const glow = def.glow ?? '#a78bfa';
      const k = o.night ? 0.55 : 0.18;
      const pulse = 0.8 + 0.2 * Math.sin(t * 1.5);
      const g = ctx.createRadialGradient(0, -H * 0.5, 0, 0, -H * 0.5, Math.max(W, H) * 0.9);
      g.addColorStop(0, alpha(glow, k * pulse));
      g.addColorStop(1, alpha(glow, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -H * 0.5, Math.max(W, H) * 0.9, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'clam': {
      const cyc = (t * 0.25) % 1;
      const open = o.pearlReady ? 1 : Math.max(0, Math.sin(cyc * Math.PI * 2)) * 0.7;
      // manto
      ctx.fillStyle = mix('#1e88e5', '#26c6da', 0.5);
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.3, W * 0.42, 0.9 + open * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      if (o.pearlReady) {
        const pg = ctx.createRadialGradient(-0.4, -H * 0.42, 0.1, 0, -H * 0.35, 1.3);
        pg.addColorStop(0, '#ffffff');
        pg.addColorStop(1, '#e7dcff');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(0, -H * 0.38, 1.2, 0, Math.PI * 2);
        ctx.fill();
        const glowG = ctx.createRadialGradient(0, -H * 0.38, 0, 0, -H * 0.38, 4);
        glowG.addColorStop(0, `rgba(255,255,255,${0.35 + 0.2 * Math.sin(t * 4)})`);
        glowG.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glowG;
        ctx.beginPath();
        ctx.arc(0, -H * 0.38, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // üst kabuk
      ctx.save();
      ctx.translate(0, -H * 0.3);
      ctx.scale(1, 1 - open * 0.25);
      ctx.translate(0, -open * 1.6);
      const g = ctx.createLinearGradient(0, -H * 0.7, 0, 0);
      g.addColorStop(0, '#f7f3ea');
      g.addColorStop(1, '#a79f90');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-W / 2, 0);
      for (let i = 0; i <= 10; i++) {
        const x = -W / 2 + (i / 10) * W;
        ctx.lineTo(x, (i % 2 ? -0.6 : 0.3));
      }
      ctx.quadraticCurveTo(W * 0.45, -H * 0.75, 0, -H * 0.75);
      ctx.quadraticCurveTo(-W * 0.45, -H * 0.75, -W / 2, 0);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'diver': {
      break;
    }
    case 'pagoda': {
      ctx.fillStyle = '#fbcfe8';
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.12 + i / 6) % 1;
        const x = W * 0.4 - ph * W * 0.5 + Math.sin(t * 1.3 + i * 2) * 1.2;
        const y = -H * 0.55 + ph * H * 0.55;
        ctx.globalAlpha = Math.min(1, (1 - ph) * 3) * 0.9;
        ctx.beginPath();
        ctx.ellipse(x, y, 0.4, 0.22, t * 2 + i, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'sandcastle': {
      const px = 0;
      const py = -H * 0.97;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let k = 0; k <= 6; k++) {
        const x = px + (k / 6) * 2.6;
        ctx.lineTo(x, py + 0.5 * (k / 6) + Math.sin(t * 5 - k * 0.9) * 0.25 * (k / 6));
      }
      for (let k = 6; k >= 0; k--) {
        const x = px + (k / 6) * 2.6;
        ctx.lineTo(x, py + 1.4 - 0.5 * (k / 6) + Math.sin(t * 5 - k * 0.9) * 0.25 * (k / 6));
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'tiki': {
      for (const s of [-1, 1]) {
        const x = s * W * 0.47;
        const y = -H * 0.6 - 0.1;
        const f = 0.85 + 0.15 * Math.sin(t * 13 + s) + 0.08 * Math.sin(t * 29 + s * 3);
        const glow = ctx.createRadialGradient(x, y - 1, 0, x, y - 1, o.night ? 5 : 2.6);
        glow.addColorStop(0, alpha('#ffb347', o.night ? 0.55 : 0.3));
        glow.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y - 1, o.night ? 5 : 2.6, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createLinearGradient(0, y - 2.4 * f, 0, y);
        g.addColorStop(0, '#fff3b0');
        g.addColorStop(0.5, '#ffb020');
        g.addColorStop(1, '#e8590c');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 0.6, y);
        ctx.quadraticCurveTo(x - 0.7, y - 1.2 * f, x + Math.sin(t * 7 + s) * 0.3, y - 2.4 * f);
        ctx.quadraticCurveTo(x + 0.7, y - 1.2 * f, x + 0.6, y);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'pumpkin': {
      const f = 0.75 + 0.15 * Math.sin(t * 11) + 0.1 * Math.sin(t * 23);
      ctx.fillStyle = alpha('#ffcf40', (o.night ? 0.95 : 0.6) * f);
      pumpkinFace(ctx, W, H);
      ctx.fill();
      if (o.night) {
        const g = ctx.createRadialGradient(0, -H * 0.4, 0, 0, -H * 0.4, W * 0.9);
        g.addColorStop(0, alpha('#ff9d2e', 0.35 * f));
        g.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, -H * 0.4, W * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'cauldron': {
      const rimY = -H * 0.46 - H * 0.38 * 0.74;
      const pulse = 0.7 + 0.3 * Math.sin(t * 2.2);
      const g = ctx.createRadialGradient(0, rimY, 0, 0, rimY, W * 0.7);
      g.addColorStop(0, alpha('#a3e635', (o.night ? 0.55 : 0.25) * pulse));
      g.addColorStop(1, 'rgba(132,204,22,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, rimY, W * 0.7, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.7 + i / 3) % 1;
        const x = (i - 1) * W * 0.18 + Math.sin(i * 5) * 0.4;
        ctx.strokeStyle = alpha('#d9f99d', 1 - ph);
        ctx.fillStyle = alpha('#bef264', 0.6 * (1 - ph));
        ctx.lineWidth = 0.1;
        ctx.beginPath();
        ctx.arc(x, rimY - ph * 0.5, 0.2 + ph * 0.45, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'giftTree': {
      const lights = treeLights(W, H);
      lights.forEach((L, i) => {
        const on = 0.5 + 0.5 * Math.sin(t * 2.5 + i * 1.7);
        const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, o.night ? 1.4 : 0.9);
        g.addColorStop(0, alpha(L.c, 0.9 * on));
        g.addColorStop(1, alpha(L.c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(L.x, L.y, o.night ? 1.4 : 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = alpha('#ffffff', 0.8 * on);
        ctx.beginPath();
        ctx.arc(L.x, L.y, 0.16, 0, Math.PI * 2);
        ctx.fill();
      });
      const sy = -H * 0.8 - 0.6;
      const sg = ctx.createRadialGradient(0, sy, 0, 0, sy, 3);
      sg.addColorStop(0, alpha('#fef08a', 0.5 + 0.2 * Math.sin(t * 3)));
      sg.addColorStop(1, 'rgba(254,240,138,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(0, sy, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

/** Kabarcık kaynağı olan dekorların yayma noktası ve sıklığı */
export function decorBubbleEmitter(def: DecorDef): { dx: number; dy: number; rate: number; burst?: boolean } | null {
  switch (def.art) {
    case 'diver': return { dx: 0.3, dy: -def.h * 0.98, rate: 1.4 };
    case 'chest': return { dx: 0, dy: -def.h * 0.7, rate: 0, burst: true };
    case 'volcano': return { dx: 0, dy: -def.h, rate: 3.5, burst: true };
    case 'cauldron': return { dx: 0, dy: -def.h * 0.75, rate: 2.2 };
    default: return null;
  }
}
