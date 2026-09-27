export const WAX_IDS = [
  'tema',
  'bordo',
  'lacivert',
  'zumrut',
  'altin',
  'gumus',
  'gul',
  'fildisi',
  'siyah',
] as const;
export type WaxId = (typeof WAX_IDS)[number];
export const EMBLEM_IDS = [
  'monogram',
  'lale',
  'zeytin',
  'halka',
  'yildiz',
] as const;
export type EmblemId = (typeof EMBLEM_IDS)[number];
export const LANGS = ['tr', 'en', 'de'] as const;
export type Lang = (typeof LANGS)[number];
export const langLabels: Record<Lang, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
};

export type InvitationAppearance = {
  palette: 'original' | 'warm' | 'cool';
  seal: 'round' | 'diamond' | 'letters';
  /** Balmumu rengi; 'tema' tasarımın kendi mührünü kullanır. */
  wax: WaxId;
  emblem: EmblemId;
  coverMode: 'initials' | 'names';
  heroMode: 'type' | 'photo';
  photo: string;
  music: string;
  sections: Record<
    'story' | 'event' | 'program' | 'menu' | 'gift' | 'rsvp',
    boolean
  >;
  coverText: string;
  font: 'classic' | 'modern';
  opening: 'cinematic' | 'gentle';
  motifs: 'rich' | 'subtle';
  /** İlk dil varsayılandır; birden fazlaysa konuk dil değiştirebilir. */
  languages: Lang[];
  /** Mühür kırılırken ve kapı açılırken kısa, sessiz sesler. */
  sounds: boolean;
};
export const defaultAppearance: InvitationAppearance = {
  palette: 'original',
  seal: 'round',
  wax: 'tema',
  emblem: 'monogram',
  coverMode: 'initials',
  heroMode: 'type',
  photo: '',
  music: '',
  sections: {
    story: true,
    event: true,
    program: true,
    menu: true,
    gift: true,
    rsvp: true,
  },
  coverText: '',
  font: 'classic',
  opening: 'cinematic',
  motifs: 'rich',
  languages: ['tr'],
  sounds: true,
};
function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}
export function parseLanguages(value: unknown): Lang[] {
  if (!Array.isArray(value)) return ['tr'];
  const list = [
    ...new Set(
      value.filter((lang): lang is Lang =>
        (LANGS as readonly unknown[]).includes(lang),
      ),
    ),
  ];
  return list.length ? list : ['tr'];
}
/** Tolerant on stored/legacy rows; request validation is strict. */
export function parseAppearance(value: unknown): InvitationAppearance {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const raw =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {};
    return {
      palette:
        raw.palette === 'warm' || raw.palette === 'cool'
          ? raw.palette
          : 'original',
      seal:
        raw.seal === 'diamond' || raw.seal === 'letters' ? raw.seal : 'round',
      wax: pick(raw.wax, WAX_IDS, 'tema'),
      emblem: pick(raw.emblem, EMBLEM_IDS, 'monogram'),
      coverMode: raw.coverMode === 'names' ? 'names' : 'initials',
      heroMode: raw.heroMode === 'photo' ? 'photo' : 'type',
      photo:
        typeof raw.photo === 'string' && /^[a-f0-9]{32}$/.test(raw.photo)
          ? raw.photo
          : '',
      music:
        typeof raw.music === 'string' && /^[a-f0-9]{32}$/.test(raw.music)
          ? raw.music
          : '',
      sections: Object.fromEntries(
        Object.keys(defaultAppearance.sections).map((key) => [
          key,
          raw.sections?.[key] !== false,
        ]),
      ) as InvitationAppearance['sections'],
      coverText:
        typeof raw.coverText === 'string' ? raw.coverText.slice(0, 80) : '',
      font: raw.font === 'modern' ? 'modern' : 'classic',
      opening: raw.opening === 'gentle' ? 'gentle' : 'cinematic',
      motifs: raw.motifs === 'subtle' ? 'subtle' : 'rich',
      languages: parseLanguages(raw.languages),
      sounds: raw.sounds !== false,
    };
  } catch {
    return structuredClone(defaultAppearance);
  }
}
