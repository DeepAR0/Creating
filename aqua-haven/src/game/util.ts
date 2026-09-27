// Küçük yardımcı fonksiyonlar

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const chance = (p: number) => Math.random() < p;
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Deterministik rastgele sayı üreteci (mulberry32) */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function weightedPick<T>(items: T[], weight: (t: T) => number, rng: () => number = Math.random): T {
  const total = items.reduce((s, it) => s + Math.max(0, weight(it)), 0);
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, weight(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

/** Yerel tarih anahtarı: YYYY-MM-DD */
export function dayKey(t: number = Date.now()): string {
  const d = new Date(t);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** İki gün anahtarı arasındaki gün farkı */
export function dayDiff(a: string, b: string): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  const da = Date.UTC(pa[0], pa[1] - 1, pa[2]);
  const db = Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round((db - da) / 86400000);
}

export function msUntilMidnight(now = Date.now()): number {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now;
}

/** Sayı biçimlendirme: 1.2B, 34.5K */
export function fmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return Math.floor(n).toLocaleString('tr-TR');
}

/** Süre biçimlendirme: 1s 20d, 3d 05sn */
export function fmtTime(sec: number, lang: 'tr' | 'en' = 'tr'): string {
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const u = lang === 'tr' ? { h: 'sa', m: 'dk', s: 'sn', d: 'g' } : { h: 'h', m: 'm', s: 's', d: 'd' };
  if (h >= 48) return `${Math.floor(h / 24)}${u.d} ${h % 24}${u.h}`;
  if (h > 0) return `${h}${u.h} ${m}${u.m}`;
  if (m > 0) return `${m}${u.m} ${`${s}`.padStart(2, '0')}${u.s}`;
  return `${s}${u.s}`;
}

export function uid(state: { nextId: number }, prefix = 'e'): string {
  state.nextId = (state.nextId || 1) + 1;
  return `${prefix}${state.nextId.toString(36)}`;
}
