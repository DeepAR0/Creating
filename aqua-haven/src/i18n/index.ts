import { en, type TKey } from './en';
import { tr } from './tr';
import type { Lang, Text } from '../game/types';
import { deviceLang } from './lang';

const DICTS: Record<Lang, Record<TKey, string>> = { en, tr };
let current: Lang = deviceLang();

export function setLang(l: Lang) {
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

export function getLang(): Lang {
  return current;
}

/** Çeviri: {param} yer tutucularını değiştirir */
export function t(key: TKey, params?: Record<string, string | number>): string {
  let s = DICTS[current][key] ?? en[key] ?? key;
  if (params) for (const k in params) s = s.split(`{${k}}`).join(String(params[k]));
  return s;
}

/** Veri dosyalarındaki çift dilli metinler */
export function tx(text: Text | undefined): string {
  if (!text) return '';
  return text[current] ?? text.en;
}

export type { TKey };
