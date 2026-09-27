import type { Lang } from '../game/types';

export function deviceLang(): Lang {
  try {
    const l = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'en';
    return l.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

export function resolveLang(pref: 'auto' | Lang): Lang {
  return pref === 'auto' ? deviceLang() : pref;
}
