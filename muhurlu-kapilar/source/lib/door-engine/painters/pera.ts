import { sealLetters } from '@/lib/wax-seal';
import { blur, clamp01, context2d, drawField, makeCanvas, yieldFrame, type Ctx2D } from '../relief';
import type { PainterInput, PainterOutput } from '../surface';
import { cavity, noise2, rgb, roundRect, serifFamily, textAcrossSeam } from './kit';

/* Pera Deco: 1920'lerin Pera'sında bir balo salonunun sürgülü kapıları.
   Piyano siyahı lake üzerinde fırçalanmış pirinç: mühürden doğan güneş
   ışınları, basamaklı köşeler, yivli dikey çizgiler ve ince bir zikzak.
   Çiftin harfleri pirinç baklavalarda, tarih altlarında. Açılışta ışık
   pirinç çizgiler boyunca koşar. */

async function decoFamily() {
  if (typeof document === 'undefined') return serifFamily();
  try {
    const faces = await Promise.race([
      document.fonts.load('400 64px "Poiret One"', 'SA&0123'),
      new Promise<FontFace[]>((resolve) => setTimeout(() => resolve([]), 1200)),
    ]);
    if (faces.length) return '"Poiret One", "Cormorant Garamond", Georgia, serif';
  } catch {
    // Yazı yüklenemedi: serif ile devam.
  }
  return serifFamily();
}

export async function paint({ width: W, height: H, personal, sealY, signal }: PainterInput): Promise<PainterOutput> {
  const N = W * H;
  const lw = W / 2;
  const seamX = W / 2;
  const cy = sealY * H;
  const family = await decoFamily();
  const letters = sealLetters(personal.initials);
  const u = lw / 100; // tasarım birimi: kanat genişliğinin yüzde biri

  /* Basamaklı köşeli çerçeve yolu (her kanat için). */
  const stepped = (ctx: Ctx2D, x: number, y: number, w: number, h: number, step: number) => {
    const s = step;
    ctx.moveTo(x + 2 * s, y);
    ctx.lineTo(x + w - 2 * s, y);
    ctx.lineTo(x + w - 2 * s, y + s);
    ctx.lineTo(x + w - s, y + s);
    ctx.lineTo(x + w - s, y + 2 * s);
    ctx.lineTo(x + w, y + 2 * s);
    ctx.lineTo(x + w, y + h - 2 * s);
    ctx.lineTo(x + w - s, y + h - 2 * s);
    ctx.lineTo(x + w - s, y + h - s);
    ctx.lineTo(x + w - 2 * s, y + h - s);
    ctx.lineTo(x + w - 2 * s, y + h);
    ctx.lineTo(x + 2 * s, y + h);
    ctx.lineTo(x + 2 * s, y + h - s);
    ctx.lineTo(x + s, y + h - s);
    ctx.lineTo(x + s, y + h - 2 * s);
    ctx.lineTo(x, y + h - 2 * s);
    ctx.lineTo(x, y + 2 * s);
    ctx.lineTo(x + s, y + 2 * s);
    ctx.lineTo(x + s, y + s);
    ctx.lineTo(x + 2 * s, y + s);
    ctx.closePath();
  };
  const leafBox = (side: 0 | 1, inset: number) => {
    const x0 = side === 0 ? inset : seamX + inset * 0.55;
    const x1 = side === 0 ? seamX - inset * 0.55 : W - inset;
    return { x: x0, y: inset, w: x1 - x0, h: H - inset * 2 };
  };

  /* Güneş: mühür merkezli ışınlar ve halkalar. */
  const R = lw * 0.74;
  const rays = 56;
  const sun = (ctx: Ctx2D) => {
    ctx.beginPath();
    for (let k = 0; k < rays; k++) {
      const a = (k / rays) * Math.PI * 2;
      const long = k % 2 === 0;
      const r0 = R * 0.34;
      const r1 = long ? R * 0.985 : R * 0.8;
      const half = (long ? 0.9 : 0.55) * (Math.PI / rays) * 0.32;
      ctx.moveTo(seamX + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(seamX + Math.cos(a - half) * r1, cy + Math.sin(a - half) * r1);
      ctx.lineTo(seamX + Math.cos(a + half) * r1, cy + Math.sin(a + half) * r1);
      ctx.closePath();
    }
    ctx.fill();
    for (const [r, width] of [
      [R * 0.3, u * 1.6],
      [R * 0.34, u * 0.5],
      [R * 0.62, u * 0.45],
      [R, u * 1.4],
      [R * 1.045, u * 0.5],
    ] as const) {
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(seamX, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  /* Harf baklavaları ve tarih. */
  const lozY = Math.max(H * 0.225, cy - R * 1.045 - lw * 0.5);
  const lozR = lw * 0.2;
  const lozenges = [seamX - lw * 0.46, seamX + lw * 0.46];
  const dateY = lozY + lozR * 1.55;

  const brassLines = drawField(W, H, (ctx) => {
    ctx.lineJoin = 'miter';
    // Çift çizgili, basamaklı köşeli çerçeve.
    for (const side of [0, 1] as const) {
      const outer = leafBox(side, u * 5.5);
      ctx.lineWidth = u * 1.3;
      ctx.beginPath();
      stepped(ctx, outer.x, outer.y, outer.w, outer.h, u * 3.2);
      ctx.stroke();
      const inner = leafBox(side, u * 9);
      ctx.lineWidth = u * 0.5;
      ctx.beginPath();
      stepped(ctx, inner.x, inner.y, inner.w, inner.h, u * 3.2);
      ctx.stroke();
    }
    // Yivli dikey çizgiler: güneşin üstünde ve altında, dairenin dışında.
    ctx.save();
    ctx.beginPath();
    for (const side of [0, 1] as const) {
      const inner = leafBox(side, u * 12);
      ctx.rect(inner.x, inner.y, inner.w, inner.h);
    }
    ctx.clip();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(seamX, cy, R * 1.12, 0, Math.PI * 2, true);
    ctx.clip();
    ctx.lineWidth = u * 0.45;
    ctx.beginPath();
    for (let x = seamX - lw; x <= seamX + lw; x += u * 6.5) {
      if (Math.abs(x - seamX) < u * 3) continue;
      ctx.moveTo(x, dateY + lozR * 0.9);
      ctx.lineTo(x, H * 0.86);
    }
    ctx.stroke();
    ctx.restore();
    // Güneş.
    ctx.save();
    ctx.beginPath();
    for (const side of [0, 1] as const) {
      const inner = leafBox(side, u * 9);
      ctx.rect(inner.x, inner.y, inner.w, inner.h);
    }
    ctx.clip();
    sun(ctx);
    ctx.restore();
    // Baklavalar: iç içe iki eşkenar dörtgen, üstte ve altta küçük basamak.
    for (const x of lozenges) {
      for (const [r, width] of [
        [lozR, u * 1.1],
        [lozR * 0.82, u * 0.45],
      ] as const) {
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x, lozY - r);
        ctx.lineTo(x + r * 0.78, lozY);
        ctx.lineTo(x, lozY + r);
        ctx.lineTo(x - r * 0.78, lozY);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.lineWidth = u * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, lozY - lozR * 1.45);
      ctx.lineTo(x, lozY - lozR * 1.08);
      ctx.moveTo(x, lozY + lozR * 1.08);
      ctx.lineTo(x, lozY + lozR * 1.3);
      ctx.stroke();
    }
    // Zikzak şerit (açılış yazısının altında).
    ctx.lineWidth = u * 0.8;
    ctx.beginPath();
    const zy = H * 0.905;
    const zstep = u * 5;
    for (let x = seamX - lw, k = 0; x <= seamX + lw; x += zstep, k++) {
      const y = zy + (k % 2 ? u * 2.4 : -u * 2.4);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = u * 0.45;
    ctx.beginPath();
    ctx.moveTo(0, zy - u * 4.2);
    ctx.lineTo(W, zy - u * 4.2);
    ctx.moveTo(0, zy + u * 4.2);
    ctx.lineTo(W, zy + u * 4.2);
    ctx.stroke();
  });
  await yieldFrame(signal);

  /* Dolu pirinç yüzeyler: harfler, tarih, kulp arkalıkları. */
  const handleX = [seamX - W * 0.128, seamX + W * 0.128];
  const handleH = (1.05 / 8.87) * H;
  const brassFill = drawField(W, H, (ctx) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.round(lozR * 0.95)}px ${family}`;
    lozenges.forEach((x, i) => ctx.fillText(letters[i] || '◆', x, lozY + lozR * 0.05));
    if (personal.date) {
      ctx.font = `400 ${Math.round(lozR * 0.32)}px ${family}`;
      ctx.textBaseline = 'middle';
      textAcrossSeam(ctx, personal.date.replaceAll(' ', ''), seamX, dateY, u * 6);
    }
    // Kulp arkalıkları: kulpların arkasında dikey pirinç plakalar.
    for (const x of handleX) {
      ctx.beginPath();
      roundRect(ctx, x - u * 3.2, cy - handleH * 0.62, u * 6.4, handleH * 1.24, u * 3.2);
      ctx.fill();
    }
  });
  const plates = drawField(W, H, (ctx) => {
    for (const x of handleX) {
      ctx.beginPath();
      roundRect(ctx, x - u * 3.2, cy - handleH * 0.62, u * 6.4, handleH * 1.24, u * 3.2);
      ctx.fill();
    }
  });
  await yieldFrame(signal);

  /* Yükseklik: pirinç kakma hafifçe yüksekte, kenarları yumuşak. */
  const brass = new Float32Array(N);
  for (let i = 0; i < N; i++) brass[i] = Math.min(1, brassLines[i] + brassFill[i]);
  const brassSoft = blur(brass, W, H, 0.9);
  const plateSoft = blur(plates, W, H, u * 0.9);
  const height = new Float32Array(N);
  for (let i = 0; i < N; i++) height[i] = 0.3 + brassSoft[i] * 0.09 + plateSoft[i] * 0.12;
  const ao = cavity(height, W, H, u * 2, 2);
  await yieldFrame(signal);

  /* Renk: lake siyahında çok hafif sıcak derinlik; pirinçte fırça izi. */
  const n = noise2(personal.seed + '|pera');
  const lacquer = rgb('#0b0a0c');
  const brassColor = rgb('#c7a35f');
  const brassDeep = rgb('#8d6d38');
  const albedo = makeCanvas(W, H);
  const actx = context2d(albedo);
  const image = actx.createImageData(W, H);
  const data = image.data;
  const roughness = new Float32Array(N);
  const metalness = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const b = brass[i];
      // Işınlar boyunca fırçalanmış doku: merkeze göre açısal çizgiler.
      const angle = Math.atan2(y - cy, x - seamX);
      const brush = n(angle * 160, Math.hypot(x - seamX, y - cy) * 0.03) * 0.6 + n(x * 0.02, y * 1.2) * 0.4;
      const depth = 0.08 + 0.05 * n(x * 0.004, y * 0.004);
      const br = brassDeep[0] + (brassColor[0] - brassDeep[0]) * (0.55 + brush * 0.45);
      const bg = brassDeep[1] + (brassColor[1] - brassDeep[1]) * (0.55 + brush * 0.45);
      const bb = brassDeep[2] + (brassColor[2] - brassDeep[2]) * (0.55 + brush * 0.45);
      const lr = lacquer[0] + depth * 0.05;
      const lg = lacquer[1] + depth * 0.035;
      const lb = lacquer[2] + depth * 0.03;
      const shade = 0.85 + 0.15 * ao[i];
      const o = i * 4;
      data[o] = clamp01((lr + (br - lr) * b) * shade) * 255;
      data[o + 1] = clamp01((lg + (bg - lg) * b) * shade) * 255;
      data[o + 2] = clamp01((lb + (bb - lb) * b) * shade) * 255;
      data[o + 3] = 255;
      roughness[i] = 0.14 + (0.3 + brush * 0.12 - 0.14) * b;
      metalness[i] = b;
    }
    if ((y & 127) === 0) await yieldFrame(signal);
  }
  actx.putImageData(image, 0, 0);
  return {
    albedo,
    height,
    roughness,
    metalness,
    ao,
    glow: blur(brassLines, W, H, 1.2),
    normalStrength: 2.6,
  };
}
