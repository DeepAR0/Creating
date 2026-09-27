import type { Theme } from './theme-registry';
import { themeRegistry } from './theme-registry';

/* Davetiyenin süsleme katmanı. İskelet (tipografi, hiyerarşi, kenar
   boşlukları) sabit kalır; değişen tek şey aşağıdaki yuvalara giren
   çizimdir. Ajan bu tipleri üretir, hizalamaya dokunamaz. */

export type MotifFamily = 'botanik' | 'iznik' | 'selcuklu' | 'deco' | 'ebru';
export type MonogramStyle =
  | 'halka'
  | 'elmas'
  | 'tugra'
  | 'deco'
  | 'celenk'
  | 'istif';
export type AyracStyle = 'nokta' | 'yildiz' | 'elmas' | 'dalga';

export type OrnamentSet = {
  family: MotifFamily;
  monogram: MonogramStyle;
  ayrac: AyracStyle;
  kose: boolean;
  muhur: boolean;
};

export const families: {
  id: MotifFamily;
  name: string;
  description: string;
}[] = [
  { id: 'botanik', name: 'Botanik', description: 'Kır düğünü, bahar, bağ' },
  { id: 'iznik', name: 'İznik', description: 'Lale, karanfil, saz yaprağı' },
  { id: 'selcuklu', name: 'Selçuklu', description: 'Geçme, yıldız, zincir' },
  { id: 'deco', name: 'Deco', description: 'Şehir, akşam, balo' },
  { id: 'ebru', name: 'Ebru', description: 'Taraklı, gelgit, akışkan' },
];

export const monogramStyles: { id: MonogramStyle; name: string }[] = [
  { id: 'halka', name: 'Halka' },
  { id: 'elmas', name: 'Elmas' },
  { id: 'tugra', name: 'Tuğra' },
  { id: 'deco', name: 'Deco' },
  { id: 'celenk', name: 'Çelenk' },
  { id: 'istif', name: 'İstif' },
];

const familyIds = families.map((f) => f.id);
const monogramIds = monogramStyles.map((m) => m.id);
const ayracIds: AyracStyle[] = ['nokta', 'yildiz', 'elmas', 'dalga'];

/* Her temanın başlangıç süslemesi tema kaydında durur. Çift hiçbir şey
   seçmezse bu gelir. */
export function ornamentFor(theme: Theme): OrnamentSet {
  return (themeRegistry[theme] ?? themeRegistry.rolyef).ornament;
}

/* Ajanın ürettiği süsleme seti buradan geçer. Tanımadığımız bir değer
   gelirse temanın varsayılanına düşer — davetiye hiçbir koşulda
   süslemesiz ya da bozuk kalmaz. */
export function parseOrnament(raw: unknown, theme: Theme): OrnamentSet {
  const fallback = ornamentFor(theme);
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  const pick = <T extends string>(value: unknown, allowed: T[], stale: T): T =>
    typeof value === 'string' && (allowed as string[]).includes(value)
      ? (value as T)
      : stale;
  return {
    family: pick(o.family, familyIds, fallback.family),
    monogram: pick(o.monogram, monogramIds, fallback.monogram),
    ayrac: pick(o.ayrac, ayracIds, fallback.ayrac),
    kose: typeof o.kose === 'boolean' ? o.kose : fallback.kose,
    muhur: typeof o.muhur === 'boolean' ? o.muhur : fallback.muhur,
  };
}

/* "Elif" + "Mert" -> "EM". Türkçe büyütme kuralı önemli: i -> İ. */
export function initials(name1: string, name2: string) {
  const firstLetter = (name: string) => {
    const trimmed = name.trim();
    return trimmed ? trimmed.slice(0, 1).toLocaleUpperCase('tr') : '';
  };
  return `${firstLetter(name1)}${firstLetter(name2)}`;
}
