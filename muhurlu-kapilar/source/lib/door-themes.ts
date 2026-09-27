import type { Theme } from './theme-registry';

export type DoorRitual = 'tap' | 'knock' | 'ribbon' | 'hold';

export type DoorConfig = {
  name: string;
  art: string;
  /** Kabartma yükseklik haritası (açık = yüksek). */
  mask: string;
  metal: string;
  ink: string;
  paper: string;
  light: string;
  /** Mührün görseldeki dikey konumu (0 üst, 1 alt). */
  y: number;
  caption: string;
  ritual: DoorRitual;
  /** stretch: görsel ekranı doldurmak için esnetilir (eski kapılar);
      cover: oran korunur, taşan kenar kırpılır. */
  fit: 'stretch' | 'cover';
  /** Açılışta kabartma sapları boyunca ince ışık izleri. */
  trails?: boolean;
  bump: number;
  /** Açılış yazısının tonu: koyu kapıda açık yazı. */
  tone: 'light' | 'dark';
  /** Tokmağın görseldeki yeri (x tüm genişliğe, y yüksekliğe oranla). */
  knocker?: { x: number; y: number };
  ribbon?: { color: string; shade: string };
};

export const doorThemes = {
  kadife: {
    name: 'Al Kadife',
    art: '/doors/kadife-door.webp',
    mask: '/doors/kadife-height.webp',
    metal: '#d7b067',
    ink: '#f8e9c8',
    paper: '#4e0d16',
    light: '#ffd48d',
    y: 0.5,
    caption: 'Mum ışığında bir kına gecesi.',
    ritual: 'tap',
    fit: 'cover',
    bump: 0.06,
    tone: 'light',
  },
  rolyef: {
    name: 'Fildişi Rölyef',
    art: '/rolyef-door.webp',
    mask: '/rolyef-relief-mask.png',
    metal: '#bda16d',
    ink: '#584323',
    paper: '#efe3ca',
    light: '#ffdc91',
    y: 0.5,
    caption: 'Hikâyemize açılan kapı.',
    ritual: 'tap',
    fit: 'stretch',
    trails: true,
    bump: 0.055,
    tone: 'dark',
  },
  zumrut: {
    name: 'Zümrüt Köşk',
    art: '/zumrut-door.webp',
    mask: '/zumrut-door.webp',
    metal: '#aa8d45',
    ink: '#f3e2b8',
    paper: '#142d21',
    light: '#ffe2a3',
    y: 0.5,
    caption: 'Bir ömre açılan köşk.',
    ritual: 'tap',
    fit: 'stretch',
    bump: 0.055,
    tone: 'light',
  },
  ayisigi: {
    name: 'Ay Işığı',
    art: '/ayisigi-door.webp',
    mask: '/ayisigi-relief-mask.png',
    metal: '#b6bdc4',
    ink: '#e6ecf4',
    paper: '#112238',
    light: '#dceaff',
    y: 0.475,
    caption: 'Gökyüzü size açılıyor.',
    ritual: 'tap',
    fit: 'stretch',
    bump: 0.055,
    tone: 'light',
  },
  rosealtin: {
    name: 'Gül Altını',
    art: '/rosealtin-door.webp',
    mask: '/rosealtin-relief-mask.png',
    metal: '#c48d73',
    ink: '#624037',
    paper: '#eed5c6',
    light: '#ffdab4',
    y: 0.48,
    caption: 'Güller ışıkla uyanıyor.',
    ritual: 'tap',
    fit: 'stretch',
    bump: 0.055,
    tone: 'dark',
  },
} satisfies Partial<Record<Theme, DoorConfig>>;
export type DoorTheme = keyof typeof doorThemes;
export function isDoorTheme(theme: Theme): theme is DoorTheme {
  return theme in doorThemes;
}
export function doorConfig(theme: DoorTheme): DoorConfig {
  return doorThemes[theme];
}

export const ritualCopy: Record<
  DoorRitual,
  { hint: string; action: string; progress?: string }
> = {
  tap: { hint: 'MÜHRE DOKUNUN', action: 'Mührü kırın, kapıyı açın' },
  knock: {
    hint: 'TOKMAKLA İKİ KEZ ÇALIN',
    action: 'Kapıyı çalın',
    progress: 'BİR KEZ DAHA',
  },
  ribbon: {
    hint: 'KURDELEYİ AŞAĞI ÇEKİN',
    action: 'Kurdeleyi çözün, kapıyı açın',
  },
  hold: {
    hint: 'MÜHRE BASILI TUTUN',
    action: 'Mührü uyandırın, kapıyı açın',
  },
};
