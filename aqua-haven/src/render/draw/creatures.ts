import type { CreatureKind, CreatureLook } from '../../game/types';
import { alpha, mix, shade } from '../color';

// Balık dışı canlılar. Birim uzay: boy ≈ 1, +x ileri, merkez (0,0), y aşağı.

export interface CreaturePose {
  phase: number; // animasyon fazı
  moving: number; // 0..1 yürüme/yüzme yoğunluğu
  swim?: number; // kurbağa/karides yüzme pozu 0..1
  pulse?: number; // denizanası
  night?: boolean;
}

export function drawCreature(ctx: CanvasRenderingContext2D, kind: CreatureKind, look: CreatureLook, pose: CreaturePose) {
  switch (kind) {
    case 'shrimp': return drawShrimp(ctx, look, pose);
    case 'snail': return drawSnail(ctx, look, pose);
    case 'crab': return drawHermit(ctx, look, pose);
    case 'crayfish': return drawCrayfish(ctx, look, pose);
    case 'frog': return drawFrog(ctx, look, pose);
    case 'axolotl': return drawAxolotl(ctx, look, pose);
    case 'jelly': return drawJelly(ctx, look, pose);
    case 'seahorse': return look.mark === 'leafy' ? drawSeadragon(ctx, look, pose) : drawSeahorse(ctx, look, pose);
    case 'starfish': return drawStarfish(ctx, look, pose);
    default: return;
  }
}

/** Canlı türüne göre görsel yükseklik oranı (yere oturtmak için) */
export function creatureHeight(kind: CreatureKind): number {
  switch (kind) {
    case 'snail': return 0.62;
    case 'crab': return 0.8;
    case 'shrimp': return 0.42;
    case 'crayfish': return 0.4;
    case 'frog': return 0.45;
    case 'axolotl': return 0.34;
    case 'starfish': return 0.9;
    case 'seahorse': return 1.4;
    default: return 0.6;
  }
}

function legLine(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, bend: number) {
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + dx * 0.5 + bend, y + dy * 0.4, x + dx, y + dy);
}

function drawShrimp(ctx: CanvasRenderingContext2D, look: CreatureLook, p: CreaturePose) {
  const ph = p.phase;
  const c1 = look.c1;
  const c2 = look.c2;
  // Antenler
  ctx.strokeStyle = alpha(shade(c1, 0.2), 0.8);
  ctx.lineWidth = 0.012;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const aw = Math.sin(ph * 0.7) * 0.05;
  ctx.moveTo(0.44, -0.06);
  ctx.bezierCurveTo(0.7, -0.3 + aw, 0.3, -0.55, -0.2, -0.5 + aw);
  ctx.moveTo(0.44, -0.04);
  ctx.bezierCurveTo(0.8, -0.12, 0.95, 0.05 + aw, 1.0, 0.25);
  ctx.stroke();
  // Bacaklar
  ctx.strokeStyle = alpha(shade(c1, -0.1), 0.85);
  ctx.lineWidth = 0.018;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const x = 0.33 - i * 0.07;
    const sw = Math.sin(ph * 2 + i * 1.2) * 0.04 * p.moving;
    legLine(ctx, x, 0.06, 0.05 + sw, 0.2, -0.02);
  }
  // Yüzme bacakları
  for (let i = 0; i < 4; i++) {
    const x = 0.0 - i * 0.09;
    const sw = Math.sin(ph * 3 + i) * 0.03;
    legLine(ctx, x, 0.08, 0.02 + sw, 0.09, 0);
  }
  ctx.stroke();
  // Kuyruk yelpazesi
  ctx.fillStyle = alpha(c1, 0.9);
  ctx.beginPath();
  ctx.moveTo(-0.38, 0.02);
  ctx.quadraticCurveTo(-0.55, -0.08, -0.6, 0.02);
  ctx.quadraticCurveTo(-0.55, 0.14, -0.38, 0.08);
  ctx.fill();
  // Karın bölümü
  const g = ctx.createLinearGradient(0, -0.16, 0, 0.12);
  g.addColorStop(0, shade(c1, -0.15));
  g.addColorStop(0.5, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0.14, -0.13);
  ctx.bezierCurveTo(-0.05, -0.2, -0.3, -0.12, -0.4, 0.0);
  ctx.lineTo(-0.4, 0.08);
  ctx.bezierCurveTo(-0.25, 0.04, -0.05, 0.12, 0.14, 0.1);
  ctx.closePath();
  ctx.fill();
  // Segment çizgileri
  ctx.strokeStyle = alpha(shade(c1, -0.4), 0.35);
  ctx.lineWidth = 0.008;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const x = 0.08 - i * 0.09;
    ctx.moveTo(x, -0.15 + i * 0.02);
    ctx.lineTo(x - 0.02, 0.09);
  }
  ctx.stroke();
  // Kabuk (baş)
  const hg = ctx.createLinearGradient(0, -0.18, 0, 0.1);
  hg.addColorStop(0, shade(c1, -0.1));
  hg.addColorStop(1, c2);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(0.08, -0.14);
  ctx.bezierCurveTo(0.2, -0.2, 0.38, -0.15, 0.44, -0.07);
  ctx.lineTo(0.58, -0.1);
  ctx.lineTo(0.45, -0.02);
  ctx.bezierCurveTo(0.42, 0.06, 0.25, 0.1, 0.1, 0.1);
  ctx.closePath();
  ctx.fill();
  // Desen
  if (look.mark === 'stripes') {
    ctx.strokeStyle = look.c3 ?? '#fff';
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.moveTo(0.4, -0.12);
    ctx.bezierCurveTo(0.2, -0.2, -0.1, -0.2, -0.38, -0.02);
    ctx.stroke();
  } else if (look.mark === 'dots') {
    ctx.fillStyle = alpha(look.c3 ?? '#5b4a3a', 0.7);
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(0.3 - i * 0.08, -0.04 + (i % 2) * 0.05, 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Parlaklık
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(0.22, -0.1, 0.12, 0.03, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Göz
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(0.4, -0.08, 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(0.41, -0.09, 0.01, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnail(ctx: CanvasRenderingContext2D, look: CreatureLook, p: CreaturePose) {
  const foot = look.c3 ?? '#5a5048';
  const stretch = 1 + Math.sin(p.phase * 0.8) * 0.04 * p.moving;
  // Ayak
  ctx.fillStyle = alpha(foot, 0.92);
  ctx.beginPath();
  ctx.moveTo(-0.42 * stretch, 0.28);
  ctx.quadraticCurveTo(-0.3, 0.1, 0.1, 0.12);
  ctx.quadraticCurveTo(0.42 * stretch, 0.1, 0.5 * stretch, 0.22);
  ctx.quadraticCurveTo(0.52 * stretch, 0.3, 0.4 * stretch, 0.31);
  ctx.lineTo(-0.42 * stretch, 0.31);
  ctx.closePath();
  ctx.fill();
  // Dokunaçlar
  ctx.strokeStyle = alpha(foot, 0.95);
  ctx.lineWidth = 0.035;
  ctx.lineCap = 'round';
  const tw = Math.sin(p.phase * 0.9) * 0.05;
  ctx.beginPath();
  ctx.moveTo(0.42 * stretch, 0.16);
  ctx.quadraticCurveTo(0.55, 0.05, 0.62 + tw, -0.02);
  ctx.moveTo(0.4 * stretch, 0.17);
  ctx.quadraticCurveTo(0.5, 0.1, 0.58 - tw, 0.05);
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(0.44 * stretch, 0.14, 0.022, 0, Math.PI * 2);
  ctx.fill();
  // Kabuk
  const cx = -0.06;
  const cy = -0.08;
  const r = 0.33;
  const g = ctx.createRadialGradient(cx - 0.1, cy - 0.12, 0.02, cx, cy, r);
  g.addColorStop(0, shade(look.c2, 0.25));
  g.addColorStop(0.6, look.c1);
  g.addColorStop(1, shade(look.c1, -0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.92, -0.2, 0, Math.PI * 2);
  ctx.fill();
  if (look.mark === 'zebra') {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.92, -0.2, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = look.c2;
    ctx.lineWidth = 0.035;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx + Math.cos(a + 0.5) * r * 0.6, cy + Math.sin(a + 0.5) * r * 0.6, cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 1.1);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Spiral
  ctx.strokeStyle = alpha(shade(look.c1, -0.55), 0.6);
  ctx.lineWidth = 0.018;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * Math.PI * 3.6 + 0.6;
    const rr = r * (1 - t) * 0.92;
    const x = cx + Math.cos(a) * rr * 0.95 + t * 0.02;
    const y = cy + Math.sin(a) * rr * 0.9 - t * 0.02;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx - 0.12, cy - 0.15, 0.08, 0.04, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawHermit(ctx: CanvasRenderingContext2D, look: CreatureLook, p: CreaturePose) {
  const ph = p.phase;
  // Bacaklar
  ctx.strokeStyle = look.c1;
  ctx.lineWidth = 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const x = 0.1 + i * 0.1;
    const sw = Math.sin(ph * 2 + i * 1.7) * 0.05 * p.moving;
    ctx.moveTo(x, 0.1);
    ctx.quadraticCurveTo(x + 0.12 + sw, 0.05, x + 0.14 + sw, 0.32);
  }
  ctx.stroke();
  // Kıskaçlar
  ctx.fillStyle = shade(look.c1, 0.1);
  ctx.beginPath();
  ctx.ellipse(0.45, 0.12, 0.12, 0.08, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0.38, 0.2, 0.08, 0.05, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Gövde / baş
  ctx.fillStyle = look.c2;
  ctx.beginPath();
  ctx.ellipse(0.22, 0.0, 0.16, 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Gözler (sap)
  ctx.strokeStyle = look.c2;
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.moveTo(0.32, -0.05);
  ctx.lineTo(0.38, -0.2);
  ctx.moveTo(0.28, -0.05);
  ctx.lineTo(0.31, -0.22);
  ctx.stroke();
  ctx.fillStyle = '#111';
  [0.38, 0.31].forEach((x, i) => {
    ctx.beginPath();
    ctx.arc(x, i ? -0.22 : -0.2, 0.03, 0, Math.PI * 2);
    ctx.fill();
  });
  // Antenler
  ctx.strokeStyle = alpha(look.c1, 0.8);
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.moveTo(0.36, -0.08);
  ctx.quadraticCurveTo(0.6, -0.3 + Math.sin(ph) * 0.05, 0.75, -0.2);
  ctx.stroke();
  // Kabuk
  const shell = look.c3 ?? '#d6c7a1';
  const g = ctx.createLinearGradient(-0.4, -0.4, 0.2, 0.2);
  g.addColorStop(0, shade(shell, 0.2));
  g.addColorStop(1, shade(shell, -0.3));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0.18, 0.12);
  ctx.bezierCurveTo(0.25, -0.2, 0.0, -0.45, -0.3, -0.38);
  ctx.bezierCurveTo(-0.5, -0.3, -0.52, 0.0, -0.36, 0.1);
  ctx.quadraticCurveTo(-0.1, 0.2, 0.18, 0.12);
  ctx.fill();
  ctx.strokeStyle = alpha(shade(shell, -0.5), 0.5);
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(0.12 - i * 0.12, 0.1 - i * 0.02);
    ctx.quadraticCurveTo(0.05 - i * 0.12, -0.15 - i * 0.03, -0.1 - i * 0.1, -0.3 + i * 0.05);
  }
  ctx.stroke();
}

function drawCrayfish(ctx: CanvasRenderingContext2D, look: CreatureLook, p: CreaturePose) {
  const ph = p.phase;
  const c1 = look.c1;
  // Antenler
  ctx.strokeStyle = alpha(look.c3 ?? c1, 0.9);
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.moveTo(0.42, -0.06);
  ctx.bezierCurveTo(0.8, -0.3, 0.9, -0.1 + Math.sin(ph * 0.6) * 0.05, 1.1, -0.35);
  ctx.moveTo(0.42, -0.04);
  ctx.bezierCurveTo(0.7, -0.1, 0.95, 0.1, 1.05, 0.02);
  ctx.stroke();
  // Bacaklar
  ctx.strokeStyle = shade(c1, -0.15);
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const x = 0.25 - i * 0.07;
    const sw = Math.sin(ph * 2 + i * 1.3) * 0.04 * p.moving;
    legLine(ctx, x, 0.05, 0.04 + sw, 0.17, 0);
  }
  ctx.stroke();
  // Kıskaçlar
  ctx.fillStyle = shade(c1, 0.05);
  const cw = Math.sin(ph * 0.5) * 0.03;
  ctx.beginPath();
  ctx.moveTo(0.35, 0.03);
  ctx.quadraticCurveTo(0.55, 0.12, 0.62, 0.06);
  ctx.quadraticCurveTo(0.8 + cw, 0.02, 0.86, 0.08);
  ctx.quadraticCurveTo(0.8, 0.12, 0.72, 0.11);
  ctx.quadraticCurveTo(0.84, 0.15, 0.85 + cw, 0.2);
  ctx.quadraticCurveTo(0.7, 0.22, 0.6, 0.15);
  ctx.quadraticCurveTo(0.5, 0.14, 0.33, 0.08);
  ctx.fill();
  // Kuyruk (karın)
  const g = ctx.createLinearGradient(0, -0.15, 0, 0.1);
  g.addColorStop(0, shade(c1, -0.2));
  g.addColorStop(1, look.c2);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0.05, -0.1);
  ctx.bezierCurveTo(-0.15, -0.14, -0.35, -0.08, -0.45, 0.02);
  ctx.lineTo(-0.58, 0.0);
  ctx.quadraticCurveTo(-0.62, 0.08, -0.5, 0.12);
  ctx.bezierCurveTo(-0.3, 0.1, -0.1, 0.08, 0.05, 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = alpha(shade(c1, -0.5), 0.4);
  ctx.lineWidth = 0.008;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const x = -0.02 - i * 0.09;
    ctx.moveTo(x, -0.11 + i * 0.015);
    ctx.lineTo(x, 0.07);
  }
  ctx.stroke();
  // Baş göğüs
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0.02, -0.12);
  ctx.bezierCurveTo(0.2, -0.17, 0.4, -0.12, 0.46, -0.04);
  ctx.lineTo(0.52, -0.05);
  ctx.lineTo(0.46, 0.0);
  ctx.bezierCurveTo(0.4, 0.07, 0.2, 0.08, 0.02, 0.07);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(0.22, -0.1, 0.12, 0.025, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(0.4, -0.07, 0.025, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrog(ctx: CanvasRenderingContext2D, look: CreatureLook, p: CreaturePose) {
  const s = p.swim ?? 0;
  const kick = Math.sin(p.phase * 2) * s;
  const c1 = look.c1;
  // Arka bacaklar
  ctx.fillStyle = shade(c1, -0.1);
  ctx.strokeStyle = shade(c1, -0.1);
  ctx.lineWidth = 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (s > 0.3) {
    ctx.moveTo(-0.2, 0.05);
    ctx.lineTo(-0.5 - kick * 0.1, 0.1);
    ctx.lineTo(-0.75 - kick * 0.15, 0.05 + kick * 0.05);
  } else {
    ctx.moveTo(-0.2, 0.08);
    ctx.lineTo(-0.05, 0.2);
    ctx.lineTo(-0.3, 0.24);
  }
  ctx.stroke();
  // Perdeli ayak
  ctx.beginPath();
  const fx = s > 0.3 ? -0.8 - kick * 0.15 : -0.35;
  const fy = s > 0.3 ? 0.05 : 0.24;
  ctx.moveTo(fx + 0.06, fy);
  ctx.lineTo(fx - 0.08, fy - 0.07);
  ctx.lineTo(fx - 0.1, fy + 0.07);
  ctx.closePath();
  ctx.fill();
  // Gövde
  const g = ctx.createLinearGradient(0, -0.2, 0, 0.18);
  g.addColorStop(0, shade(c1, -0.15));
  g.addColorStop(1, look.c2);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0.02, 0.0, 0.34, 0.17, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0.3, -0.04, 0.14, 0.12, 0.2, 0, Math.PI * 2);
  ctx.fill();
  if (look.mark === 'dots') {
    ctx.fillStyle = alpha(look.c3 ?? '#333', 0.6);
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(-0.2 + i * 0.07, -0.08 + (i % 3) * 0.04, 0.018, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Ön bacak
  ctx.strokeStyle = shade(c1, -0.05);
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(0.22, 0.08);
  ctx.lineTo(0.32 + kick * 0.05, 0.2);
  ctx.stroke();
  // Göz
  ctx.fillStyle = '#e9e2c8';
  ctx.beginPath();
  ctx.arc(0.36, -0.12, 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(0.37, -0.12, 0.025, 0, Math.PI * 2);
  ctx.fill();
}

function drawAxolotl(ctx: CanvasRenderingContext2D, look: CreatureLook, p: CreaturePose) {
  const ph = p.phase;
  const c1 = look.c1;
  const c2 = look.c2;
  const gill = look.c3 ?? '#e63958';
  if (look.glow && p.night) {
    ctx.save();
    ctx.shadowColor = look.glow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = alpha(look.glow, 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.5, 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Kuyruk yüzgeci
  const tw = Math.sin(ph) * 0.06 * (0.3 + p.moving);
  ctx.fillStyle = alpha(mix(c1, '#ffffff', 0.35), 0.75);
  ctx.beginPath();
  ctx.moveTo(0.0, -0.1);
  ctx.bezierCurveTo(-0.25, -0.2, -0.45, -0.15 + tw, -0.62, -0.02 + tw);
  ctx.bezierCurveTo(-0.45, 0.1 + tw, -0.25, 0.14, 0.0, 0.08);
  ctx.fill();
  // Bacaklar
  ctx.strokeStyle = shade(c1, -0.08);
  ctx.lineWidth = 0.05;
  ctx.lineCap = 'round';
  const wl = Math.sin(ph * 1.5) * 0.05 * p.moving;
  ctx.beginPath();
  ctx.moveTo(0.18, 0.06);
  ctx.lineTo(0.24 + wl, 0.2);
  ctx.moveTo(-0.12, 0.06);
  ctx.lineTo(-0.06 - wl, 0.2);
  ctx.stroke();
  // Gövde
  const g = ctx.createLinearGradient(0, -0.14, 0, 0.12);
  g.addColorStop(0, shade(c1, -0.05));
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0.3, -0.1);
  ctx.bezierCurveTo(0.1, -0.13, -0.15, -0.11, -0.35, -0.04 + tw * 0.5);
  ctx.bezierCurveTo(-0.45, 0.0 + tw * 0.5, -0.35, 0.06, -0.15, 0.08);
  ctx.bezierCurveTo(0.05, 0.1, 0.2, 0.1, 0.3, 0.08);
  ctx.closePath();
  ctx.fill();
  if (look.mark === 'dots') {
    ctx.fillStyle = alpha(shade(c1, -0.4), 0.5);
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(0.25 - i * 0.05, -0.06 + (i % 3) * 0.04, 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Solungaçlar (3 dal)
  for (let i = 0; i < 3; i++) {
    const ang = -0.9 - i * 0.45;
    const sway = Math.sin(ph * 0.8 + i) * 0.08;
    const bx = 0.34;
    const by = -0.05;
    const ex = bx + Math.cos(ang + sway) * 0.2;
    const ey = by + Math.sin(ang + sway) * 0.2;
    ctx.strokeStyle = gill;
    ctx.lineWidth = 0.022;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    for (let k = 1; k <= 5; k++) {
      const t = k / 6;
      const x = bx + (ex - bx) * t;
      const y = by + (ey - by) * t;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 0.04, y - 0.025);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.02, y - 0.04);
    }
    ctx.stroke();
  }
  // Baş
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.ellipse(0.38, -0.01, 0.15, 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(0.36, -0.07, 0.08, 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  // Göz ve gülümseme
  ctx.fillStyle = '#1a1014';
  ctx.beginPath();
  ctx.arc(0.45, -0.04, 0.022, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alpha(shade(c1, -0.5), 0.8);
  ctx.lineWidth = 0.01;
  ctx.beginPath();
  ctx.arc(0.45, 0.02, 0.05, 0.2, 1.2);
  ctx.stroke();
}

function drawJelly(ctx: CanvasRenderingContext2D, look: CreatureLook, p: CreaturePose) {
  const pulse = p.pulse ?? 0;
  const sx = 1 + pulse * 0.12;
  const sy = 1 - pulse * 0.12;
  if (p.night && look.glow) {
    const gg = ctx.createRadialGradient(0, -0.05, 0, 0, -0.05, 0.6);
    gg.addColorStop(0, alpha(look.glow, 0.5));
    gg.addColorStop(1, alpha(look.glow, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(-0.7, -0.7, 1.4, 1.4);
  }
  // Ağız kolları
  ctx.strokeStyle = alpha(look.c3 ?? look.c2, 0.45);
  ctx.lineWidth = 0.03;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const x = -0.08 + i * 0.055;
    ctx.beginPath();
    ctx.moveTo(x, 0.05);
    for (let k = 1; k <= 8; k++) {
      const t = k / 8;
      ctx.lineTo(x + Math.sin(p.phase * 0.8 + t * 5 + i) * 0.05 * t, 0.05 + t * (0.55 + i * 0.05));
    }
    ctx.stroke();
  }
  // Dokunaç saçakları
  ctx.strokeStyle = alpha(look.c2, 0.35);
  ctx.lineWidth = 0.008;
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const x = (-0.45 + (i / 13) * 0.9) * sx;
    ctx.moveTo(x, 0.04);
    ctx.quadraticCurveTo(x + Math.sin(p.phase + i) * 0.04, 0.2, x + Math.sin(p.phase * 1.3 + i) * 0.06, 0.34);
  }
  ctx.stroke();
  // Çan
  ctx.save();
  ctx.scale(sx, sy);
  const g = ctx.createRadialGradient(0, -0.1, 0.02, 0, 0, 0.5);
  g.addColorStop(0, look.c2);
  g.addColorStop(1, look.c1);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-0.48, 0.05);
  ctx.bezierCurveTo(-0.5, -0.35, 0.5, -0.35, 0.48, 0.05);
  ctx.quadraticCurveTo(0, -0.02, -0.48, 0.05);
  ctx.fill();
  ctx.strokeStyle = alpha('#ffffff', 0.35);
  ctx.lineWidth = 0.012;
  ctx.stroke();
  // Dört yonca gonad
  ctx.strokeStyle = alpha(look.c3 ?? '#d8b4fe', 0.8);
  ctx.lineWidth = 0.025;
  for (let i = 0; i < 4; i++) {
    const cx = -0.16 + i * 0.105;
    ctx.beginPath();
    ctx.arc(cx, -0.1, 0.05, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSeahorse(ctx: CanvasRenderingContext2D, look: CreatureLook, p: CreaturePose) {
  const c1 = look.c1;
  const g = ctx.createLinearGradient(-0.2, -0.5, 0.3, 0.5);
  g.addColorStop(0, shade(c1, 0.1));
  g.addColorStop(1, shade(c1, -0.25));
  // Sırt yüzgeci
  const fl = Math.sin(p.phase * 3) * 0.04;
  ctx.fillStyle = alpha(look.c2, 0.6);
  ctx.beginPath();
  ctx.moveTo(-0.14, -0.05);
  ctx.quadraticCurveTo(-0.3 - fl, 0.02, -0.16, 0.14);
  ctx.closePath();
  ctx.fill();
  // Gövde (S şekli)
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0.05, -0.42);
  ctx.bezierCurveTo(-0.12, -0.42, -0.2, -0.25, -0.15, -0.1);
  ctx.bezierCurveTo(-0.1, 0.05, -0.2, 0.2, -0.08, 0.32);
  ctx.bezierCurveTo(0.0, 0.42, 0.12, 0.42, 0.14, 0.52);
  ctx.bezierCurveTo(0.16, 0.62, 0.02, 0.66, -0.02, 0.58);
  ctx.bezierCurveTo(0.05, 0.6, 0.1, 0.56, 0.06, 0.5);
  ctx.bezierCurveTo(0.0, 0.42, -0.02, 0.4, 0.04, 0.3);
  ctx.bezierCurveTo(0.14, 0.18, 0.1, 0.0, 0.1, -0.12);
  ctx.bezierCurveTo(0.1, -0.2, 0.12, -0.26, 0.16, -0.3);
  ctx.closePath();
  ctx.fill();
  // Baş ve burun
  ctx.beginPath();
  ctx.ellipse(0.08, -0.38, 0.1, 0.08, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.12, -0.42);
  ctx.lineTo(0.38, -0.36);
  ctx.lineTo(0.38, -0.31);
  ctx.lineTo(0.12, -0.32);
  ctx.closePath();
  ctx.fill();
  // Taç
  ctx.beginPath();
  ctx.moveTo(0.02, -0.44);
  ctx.lineTo(0.05, -0.52);
  ctx.lineTo(0.1, -0.45);
  ctx.fill();
  // Halkalar
  ctx.strokeStyle = alpha(shade(c1, -0.45), 0.45);
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const y = -0.18 + i * 0.07;
    ctx.moveTo(-0.14 + (i > 5 ? 0.12 : 0), y);
    ctx.lineTo(0.1 + (i > 5 ? 0.06 : 0), y + 0.02);
  }
  ctx.stroke();
  if (look.mark === 'dots' || look.mark === 'zebra') {
    ctx.fillStyle = look.mark === 'zebra' ? '#1c1917' : alpha(look.c2, 0.8);
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      if (look.mark === 'zebra') ctx.ellipse(-0.02, -0.2 + i * 0.07, 0.1, 0.012, 0.15, 0, Math.PI * 2);
      else ctx.arc(-0.05 + (i % 2) * 0.08, -0.2 + i * 0.06, 0.015, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Göz
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(0.1, -0.39, 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(0.108, -0.398, 0.008, 0, Math.PI * 2);
  ctx.fill();
}

function drawSeadragon(ctx: CanvasRenderingContext2D, look: CreatureLook, p: CreaturePose) {
  const c1 = look.c1;
  const leaf = look.c3 ?? '#65a30d';
  const sway = (i: number) => Math.sin(p.phase * 0.7 + i) * 0.03;
  const leafAt = (x: number, y: number, ang: number, len: number, i: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + sway(i));
    ctx.fillStyle = alpha(leaf, 0.85);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.25, len, 0);
    ctx.quadraticCurveTo(len * 0.5, len * 0.25, 0, 0);
    ctx.fill();
    ctx.restore();
  };
  const leaves: [number, number, number, number][] = [
    [0.1, -0.1, -2.2, 0.22], [0.0, -0.08, -1.7, 0.25], [-0.15, -0.02, -2.5, 0.2], [-0.2, 0.05, 2.4, 0.22],
    [0.05, 0.05, 1.9, 0.2], [-0.35, 0.1, 2.0, 0.18], [-0.45, 0.12, -2.6, 0.16], [0.25, -0.15, -1.3, 0.15],
  ];
  leaves.forEach((l, i) => leafAt(l[0], l[1], l[2], l[3], i));
  const g = ctx.createLinearGradient(0, -0.1, 0, 0.1);
  g.addColorStop(0, shade(c1, -0.1));
  g.addColorStop(1, look.c2);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0.3, -0.12);
  ctx.bezierCurveTo(0.1, -0.12, -0.1, -0.05, -0.3, 0.05);
  ctx.bezierCurveTo(-0.45, 0.12, -0.55, 0.2, -0.6, 0.3);
  ctx.bezierCurveTo(-0.55, 0.22, -0.45, 0.16, -0.3, 0.1);
  ctx.bezierCurveTo(-0.1, 0.03, 0.1, 0.0, 0.3, -0.02);
  ctx.closePath();
  ctx.fill();
  // Baş ve uzun burun
  ctx.beginPath();
  ctx.ellipse(0.3, -0.07, 0.07, 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.34, -0.1);
  ctx.lineTo(0.58, -0.08);
  ctx.lineTo(0.58, -0.05);
  ctx.lineTo(0.34, -0.04);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(0.32, -0.08, 0.018, 0, Math.PI * 2);
  ctx.fill();
}

function drawStarfish(ctx: CanvasRenderingContext2D, look: CreatureLook, p: CreaturePose) {
  const g = ctx.createRadialGradient(0, 0, 0.02, 0, 0, 0.5);
  g.addColorStop(0, shade(look.c2, 0.1));
  g.addColorStop(1, look.c1);
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2 + Math.sin(p.phase * 0.2) * 0.02;
    const r = i % 2 === 0 ? 0.48 : 0.15;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(Math.cos(a - 0.3) * r * 0.7, Math.sin(a - 0.3) * r * 0.7, x, y);
  }
  ctx.closePath();
  ctx.fill();
  if (look.mark === 'dots') {
    ctx.fillStyle = alpha(look.c3 ?? shade(look.c1, -0.4), 0.55);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      for (let k = 1; k <= 3; k++) {
        ctx.beginPath();
        ctx.arc(Math.cos(a) * k * 0.11, Math.sin(a) * k * 0.11, 0.018, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(-0.08, -0.1, 0.12, 0.05, -0.5, 0, Math.PI * 2);
  ctx.fill();
}
