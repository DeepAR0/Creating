import { blur, clamp01, hash, type Ctx2D, type Field } from '../relief';

/* Çizimli kapıların ortak fırçaları: nokta örneklemeli gürültü, ahşap
   damarı, boşluk gölgesi ve malzeme karışımı. Boyacılar önce Canvas ile
   keskin maskeler çizer, sonra bu araçlarla piksel piksel malzeme verir. */

export type RGB = [number, number, number];

export const rgb = (hex: string): RGB => {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

/** Tohumlu, sınırsız değer gürültüsü: n(x, y) ∈ [0, 1]. */
export function noise2(seed: string | number) {
  const s = typeof seed === 'number' ? seed : hash(seed);
  const lattice = (ix: number, iy: number) => {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ s;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  return (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = lattice(ix, iy);
    const b = lattice(ix + 1, iy);
    const c = lattice(ix, iy + 1);
    const d = lattice(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

export type Noise = ReturnType<typeof noise2>;

/** Ahşap damarı: açıya göre uzatılmış lifler ve yıllık halkalar (0–1). */
export function wood(n: Noise, x: number, y: number, angle: number, scale = 1) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const u = (x * c + y * s) / scale;
  const v = (-x * s + y * c) / scale;
  const warp = n(u * 0.004, v * 0.02) * 9;
  const rings = 0.5 + 0.5 * Math.sin(v * 0.11 + warp);
  const fibers = n(u * 0.012, v * 0.55);
  const streak = n(u * 0.002 + 13.1, v * 0.045);
  return clamp01(rings * 0.38 + fibers * 0.34 + streak * 0.42 - 0.07);
}

/** Yüksekliğe göre boşluk gölgesi (girintiler koyulaşır). */
export function cavity(height: Field, w: number, h: number, radius: number, strength: number) {
  const wide = blur(height, w, h, radius);
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = Math.min(1.05, Math.max(0.45, 1 + (height[i] - wide[i]) * strength));
  return out;
}

export const lerp3 = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Belgedeki serif yazı ailesi (yüklendiyse Cormorant). */
export function serifFamily() {
  if (typeof document === 'undefined') return 'Georgia, serif';
  const loaded = [...document.fonts].some(
    (font) => font.family.replaceAll('"', '') === 'Cormorant Garamond' && font.status === 'loaded',
  );
  return loaded ? '"Cormorant Garamond", Georgia, serif' : 'Georgia, "Times New Roman", serif';
}

/** Yıldız çokgeni: `points` uç, dış ve iç yarıçap. */
export function starPath(
  ctx: Ctx2D | Path2D,
  cx: number,
  cy: number,
  points: number,
  outer: number,
  inner: number,
  rotation = 0,
) {
  for (let k = 0; k < points * 2; k++) {
    const r = k % 2 ? inner : outer;
    const a = rotation + (k * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Köşeleri yuvarlatılmış dikdörtgen yolu. */
export function roundRect(ctx: Ctx2D | Path2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

/** Yolu boyunca eşit aralıklı noktalar (inci dizisi, perçin, boncuk). */
export function dotsAlongRect(
  ctx: Ctx2D,
  x: number,
  y: number,
  w: number,
  h: number,
  step: number,
  radius: number,
) {
  const along = (x0: number, y0: number, x1: number, y1: number) => {
    const length = Math.hypot(x1 - x0, y1 - y0);
    const count = Math.max(1, Math.round(length / step));
    for (let i = 0; i < count; i++) {
      const t = i / count;
      ctx.moveTo(x0 + (x1 - x0) * t + radius, y0 + (y1 - y0) * t);
      ctx.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, 0, Math.PI * 2);
    }
  };
  ctx.beginPath();
  along(x, y, x + w, y);
  along(x + w, y, x + w, y + h);
  along(x + w, y + h, x, y + h);
  along(x, y + h, x, y);
  ctx.fill();
}

/** Maske alanlarını ağırlıklı toplar: base + Σ k·m. */
export function sum(length: number, base: number, terms: [Field, number][]) {
  const out = new Float32Array(length).fill(base);
  for (const [field, k] of terms) for (let i = 0; i < length; i++) out[i] += field[i] * k;
  return out;
}

/** a - b (0'da kırpılır). */
export function minus(a: Field, b: Field) {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = Math.max(0, a[i] - b[i]);
  return out;
}

/** Tarihi birleşim çizgisinin iki yanına böler: "12 · 06 · 2027" → ["12 · 06", "2027"]. */
export function splitDate(date: string): [string, string] | null {
  const parts = date.split(/\s*[·.\/\-]\s*/).filter(Boolean);
  if (parts.length < 2) return null;
  const last = parts.pop()!;
  return [parts.join(' · '), last];
}

/** Metni birleşim çizgisinin iki yanına yazar; ortada boşluk kalır. */
export function textAcrossSeam(ctx: Ctx2D, text: string, seamX: number, y: number, gap: number) {
  const split = splitDate(text);
  if (!split) {
    ctx.textAlign = 'center';
    ctx.fillText(text, seamX, y);
    return;
  }
  ctx.textAlign = 'right';
  ctx.fillText(split[0], seamX - gap, y);
  ctx.textAlign = 'left';
  ctx.fillText(split[1], seamX + gap, y);
}
