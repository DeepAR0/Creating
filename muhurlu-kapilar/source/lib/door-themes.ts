import type { Lang } from './invitation-appearance';
import type { Theme } from './theme-registry';

export type DoorRitual =
  | 'tap'
  | 'knock'
  | 'ribbon'
  | 'hold'
  /** Anahtarı dairesel sürükleyerek çevirmek. */
  | 'key'
  /** Camdaki buğuyu parmakla silmek. */
  | 'wipe'
  /** Sürgülü kanatları iki yana çekmek. */
  | 'slide';

/** Tarayıcıda boyanan kapılar (görsel dosyası gerektirmez). */
export type DoorPainterId = 'kakma' | 'kisbahcesi' | 'pera';

/** Kanat yüzeyinin malzeme davranışı. */
export type DoorFinish =
  /** Mat lake / alçı (varsayılan). */
  | 'matte'
  /** Cilalı ceviz, sedef yanardöner kakma. */
  | 'pearl'
  /** Piyano siyahı lake, fırçalanmış pirinç. */
  | 'lacquer'
  /** Dövme demir, cam delikleri. */
  | 'iron';

/** Açılışta ışığın içinde süzülen parçacıklar. */
export type DoorAtmosphere = 'dust' | 'pearl' | 'snow' | 'bubbles';

/** Açılış seslerinin karakteri. */
export type DoorSoundscape = 'classic' | 'ivory' | 'pearl' | 'winter' | 'deco';

export type DoorConfig = {
  name: string;
  /** Kapı görseli. Çizimli kapılarda yükleme/yedek için pişmiş kapak. */
  art: string;
  /** Kabartma yükseklik haritası: alfa kanalı ya da parlaklık (açık = yüksek). */
  mask?: string;
  /** Doluysa kapı tarayıcıda çizilir; çiftin harfleri kapıya işlenir. */
  procedural?: DoorPainterId;
  metal: string;
  ink: string;
  paper: string;
  light: string;
  /** Mührün görseldeki dikey konumu (0 üst, 1 alt). */
  y: number;
  caption: string;
  /** Diğer dillerde kapı başlığı. */
  captions?: Partial<Record<Lang, string>>;
  ritual: DoorRitual;
  /** stretch: görsel ekranı doldurmak için esnetilir (eski kapılar);
      cover: oran korunur, taşan kenar kırpılır. */
  fit: 'stretch' | 'cover';
  /** Eski ad: açılışta kabartmalarda ışık dolaşsın (bkz. `wave`). */
  trails?: boolean;
  /** Mühürden yayılan ışık dalgası kabartmaları sırayla aydınlatır;
      beklerken ara ara ince bir parıltı geçer. */
  wave?: boolean;
  /** Kabartma derinliği (0.055 ≈ Fildişi). */
  bump: number;
  /** Açılış yazısının tonu: koyu kapıda açık yazı. */
  tone: 'light' | 'dark';
  /** Tokmağın görseldeki yeri (x tüm genişliğe, y yüksekliğe oranla). */
  knocker?: { x: number; y: number };
  ribbon?: { color: string; shade: string };
  /** swing: menteşeli kanatlar (varsayılan); slide: sürgülü kanatlar. */
  motion?: 'swing' | 'slide';
  finish?: DoorFinish;
  atmosphere?: DoorAtmosphere;
  soundscape?: DoorSoundscape;
  /** Birleşim çizgisinin iki yanında pirinç kulplar. */
  handles?: boolean;
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
    captions: {
      en: 'A henna night by candlelight.',
      de: 'Eine Henna-Nacht bei Kerzenschein.',
    },
    ritual: 'tap',
    fit: 'cover',
    bump: 0.06,
    tone: 'light',
    atmosphere: 'dust',
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
    captions: {
      en: 'The door to our story.',
      de: 'Die Tür zu unserer Geschichte.',
    },
    ritual: 'tap',
    fit: 'stretch',
    trails: true,
    wave: true,
    bump: 0.055,
    tone: 'dark',
    atmosphere: 'dust',
    soundscape: 'ivory',
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
    captions: {
      en: 'A pavilion opening onto a lifetime.',
      de: 'Ein Pavillon, der sich einem ganzen Leben öffnet.',
    },
    ritual: 'tap',
    fit: 'stretch',
    bump: 0.055,
    tone: 'light',
    atmosphere: 'dust',
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
    captions: {
      en: 'The sky opens for you.',
      de: 'Der Himmel öffnet sich für Sie.',
    },
    ritual: 'tap',
    fit: 'stretch',
    wave: true,
    bump: 0.055,
    tone: 'light',
    atmosphere: 'pearl',
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
    captions: {
      en: 'Roses awaken with the light.',
      de: 'Rosen erwachen im Licht.',
    },
    ritual: 'tap',
    fit: 'stretch',
    wave: true,
    bump: 0.055,
    tone: 'dark',
    atmosphere: 'dust',
  },
  kakma: {
    name: 'Sedef Kakma',
    art: '/kakma-door.webp',
    procedural: 'kakma',
    metal: '#c9a45e',
    ink: '#f3eadb',
    paper: '#2b1a10',
    light: '#ffe7c2',
    y: 0.47,
    caption: 'Kapımızın anahtarı sizde.',
    captions: {
      en: 'The key to our door is yours.',
      de: 'Der Schlüssel zu unserer Tür gehört Ihnen.',
    },
    ritual: 'key',
    fit: 'stretch',
    wave: true,
    bump: 0.055,
    tone: 'light',
    finish: 'pearl',
    atmosphere: 'pearl',
    soundscape: 'pearl',
  },
  kisbahcesi: {
    name: 'Kış Bahçesi',
    art: '/kisbahcesi-door.webp',
    procedural: 'kisbahcesi',
    metal: '#8f8a83',
    ink: '#f6efe4',
    paper: '#171514',
    light: '#ffd59a',
    y: 0.5,
    caption: 'Camın ardında bir kış masalı.',
    captions: {
      en: 'A winter tale behind the glass.',
      de: 'Ein Wintermärchen hinter dem Glas.',
    },
    ritual: 'wipe',
    fit: 'stretch',
    bump: 0.05,
    tone: 'light',
    finish: 'iron',
    atmosphere: 'snow',
    soundscape: 'winter',
  },
  pera: {
    name: 'Pera Deco',
    art: '/pera-door.webp',
    procedural: 'pera',
    metal: '#c9a45c',
    ink: '#f5e6c4',
    paper: '#0b0b0d',
    light: '#ffe2a6',
    y: 0.5,
    caption: 'Bir Pera gecesi, bir ömür.',
    captions: {
      en: 'One night in Pera, one lifetime.',
      de: 'Eine Nacht in Pera, ein ganzes Leben.',
    },
    ritual: 'slide',
    fit: 'stretch',
    wave: true,
    bump: 0.05,
    tone: 'light',
    motion: 'slide',
    finish: 'lacquer',
    atmosphere: 'bubbles',
    soundscape: 'deco',
    handles: true,
  },
} satisfies Partial<Record<Theme, DoorConfig>>;
export type DoorTheme = keyof typeof doorThemes;
export function isDoorTheme(theme: Theme): theme is DoorTheme {
  return theme in doorThemes;
}
export function doorConfig(theme: DoorTheme): DoorConfig {
  return doorThemes[theme];
}

/** Işık dalgası: yeni `wave` ya da eski `trails` bayrağı. */
export function hasWave(door: DoorConfig) {
  return Boolean(door.wave ?? door.trails);
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
  key: {
    hint: 'ANAHTARI ÇEVİRİN',
    action: 'Anahtarı çevirin, kapıyı açın',
    progress: 'BİRAZ DAHA ÇEVİRİN',
  },
  wipe: {
    hint: 'CAMDAKİ BUĞUYU SİLİN',
    action: 'Buğuyu silin, kapıyı açın',
    progress: 'IŞIKLAR GÖRÜNÜYOR…',
  },
  slide: {
    hint: 'KANATLARI İKİ YANA ÇEKİN',
    action: 'Kanatları çekin, kapıyı açın',
    progress: 'MÜHÜR ZORLANIYOR…',
  },
};
