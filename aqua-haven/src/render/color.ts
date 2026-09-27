// Renk yardımcıları: hex/rgba ayrıştırma, karıştırma, açma/koyultma

export type RGBA = [number, number, number, number];

const cache = new Map<string, RGBA>();

export function parseColor(c: string): RGBA {
  const hit = cache.get(c);
  if (hit) return hit;
  let out: RGBA = [0, 0, 0, 1];
  const s = c.trim();
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    out = [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  } else {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(',').map((x) => parseFloat(x));
      out = [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
  }
  cache.set(c, out);
  return out;
}

export function rgba(c: RGBA): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.round(c[3] * 1000) / 1000})`;
}

export function mix(a: string, b: string, t: number): string {
  const A = parseColor(a);
  const B = parseColor(b);
  return rgba([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, A[3] + (B[3] - A[3]) * t]);
}

/** k > 0 açar (beyaza), k < 0 koyultur (siyaha) */
export function shade(c: string, k: number): string {
  const A = parseColor(c);
  if (k >= 0) return rgba([A[0] + (255 - A[0]) * k, A[1] + (255 - A[1]) * k, A[2] + (255 - A[2]) * k, A[3]]);
  const f = 1 + k;
  return rgba([A[0] * f, A[1] * f, A[2] * f, A[3]]);
}

export function alpha(c: string, a: number): string {
  const A = parseColor(c);
  return rgba([A[0], A[1], A[2], A[3] * a]);
}

export function opaque(c: string): string {
  const A = parseColor(c);
  return rgba([A[0], A[1], A[2], 1]);
}
