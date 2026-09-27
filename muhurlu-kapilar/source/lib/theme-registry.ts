import type { OrnamentSet } from './ornament';

/* Tek kaynak: her tasarımın adı, koleksiyon metni, süslemesi ve açılış
   türü burada. Yeni bir tasarım eklemek için bu listeye bir kayıt, kapı
   ise door-themes.ts'e görsel ayarı eklemek yeterlidir. Sıra, katalog ve
   atölyedeki sıradır. */
export const THEME_IDS = [
  'kadife',
  'rolyef',
  'zumrut',
  'ayisigi',
  'rosealtin',
  'pudra',
  'gulmuhur',
  'gulipek',
  'sedef',
  'gecealtini',
  'gece',
  'inci',
  'safak',
  'cini',
  'botanik',
  'siyahinci',
] as const;

export type Theme = (typeof THEME_IDS)[number];

/* Kurdelenin her temada nasıl davrandığı: yayın sertliği ve sönümü,
   dalganın turu ve genliği. */
export type ThemeMotion = {
  stiffness: number;
  damping: number;
  wavePeriod: number;
  waveAmp: number;
};

export type ThemeSeries = 'kapi' | 'zarf' | 'klasik';
export type ThemeOpening = 'door' | 'material' | 'garden';

export type ThemeDefinition = {
  id: Theme;
  name: string;
  /** Atölyedeki kısa açıklama. */
  description: string;
  series: ThemeSeries;
  opening: ThemeOpening;
  /** Koleksiyon kartı. */
  tag: string;
  subtitle: string;
  material: string;
  openingCopy: string;
  cover: string;
  motion: ThemeMotion;
  ornament: OrnamentSet;
  storyTouch: string;
  /** Kapı motoru dışındaki açılışların süresi (ms). */
  openingMs: number;
  /** Yeni koleksiyon rozeti. */
  isNew?: boolean;
};

const calm: ThemeMotion = {
  stiffness: 60,
  damping: 24,
  wavePeriod: 9,
  waveAmp: 3,
};

export const themeRegistry: Record<Theme, ThemeDefinition> = {
  kadife: {
    id: 'kadife',
    name: 'Al Kadife',
    description: 'Kırmızı kadife, sırma işleme · Kına gecesine yakışır',
    series: 'kapi',
    opening: 'door',
    tag: 'Sırma işlemeli kapı',
    subtitle: 'Mum ışığında bir kına gecesi.',
    material: 'Al kadife · Sırma işi · Altın mühür',
    openingCopy:
      'Altın mühre dokunun; sırma işlemeli kadife kanatlar mum ışığında açılır.',
    cover: '/doors/kadife-door.webp',
    motion: { stiffness: 58, damping: 22, wavePeriod: 8.8, waveAmp: 4 },
    ornament: {
      family: 'iznik',
      monogram: 'elmas',
      ayrac: 'elmas',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Mumu yakın',
    openingMs: 5200,
    isNew: true,
  },
  rolyef: {
    id: 'rolyef',
    name: 'Fildişi Rölyef',
    description: 'Kabartmalı fildişi kapılar · Şampanya mühür',
    series: 'kapi',
    opening: 'door',
    tag: 'Çift kanatlı kapı',
    subtitle: 'Bir kapı, bin ince detay.',
    material: 'Fildişi · Kabartma zambak · Şampanya',
    openingCopy:
      'Mühür çatlar, ışık kabartmalarda gezinir; iki kanat mührün yarılarıyla birlikte açılır.',
    cover: '/rolyef-door.webp',
    motion: calm,
    ornament: {
      family: 'botanik',
      monogram: 'celenk',
      ayrac: 'nokta',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Rölyefe dokunun',
    openingMs: 5200,
  },
  zumrut: {
    id: 'zumrut',
    name: 'Zümrüt Köşk',
    description: 'Altın işlemeli köşk kapısı · Zümrüt kadife',
    series: 'kapi',
    opening: 'door',
    tag: 'İşlemeli köşk kapısı',
    subtitle: 'Gecenin en güzel daveti.',
    material: 'Zümrüt · Altın rölyef · Manolya',
    openingCopy:
      'Altın işlemeli kapılar aralanır; ışığın içinden davetiniz belirir.',
    cover: '/zumrut-door.webp',
    motion: calm,
    ornament: {
      family: 'deco',
      monogram: 'deco',
      ayrac: 'elmas',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Köşk sırrını açın',
    openingMs: 5200,
  },
  ayisigi: {
    id: 'ayisigi',
    name: 'Ay Işığı',
    description: 'Gümüş yıldızlar ve gece mavisi kapılar',
    series: 'kapi',
    opening: 'door',
    tag: 'Göksel kapı',
    subtitle: 'Gökyüzü bu gece size açılıyor.',
    material: 'Gece mavisi · Gümüş rölyef · İnci tozu',
    openingCopy:
      'Mühürden doğan ay ışığı yıldız yollarını izler; göksel kapılar ağır ağır açılır.',
    cover: '/ayisigi-door.webp',
    motion: { stiffness: 72, damping: 25, wavePeriod: 11, waveAmp: 3.4 },
    ornament: {
      family: 'deco',
      monogram: 'halka',
      ayrac: 'yildiz',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Ay ışığını uyandırın',
    openingMs: 5200,
  },
  rosealtin: {
    id: 'rosealtin',
    name: 'Gül Altını',
    description: 'Kabartmalı güller ve sıcak inci ışığı',
    series: 'kapi',
    opening: 'door',
    tag: 'Botanik rölyef',
    subtitle: 'Işık, güllerin arasından geçiyor.',
    material: 'Pudra · Gül altını · İnci çiçekler',
    openingCopy:
      'Sıcak ışık mühürden sarmaşıklara yayılır; kabartmalı gül kapıları hikâyenize açılır.',
    cover: '/rosealtin-door.webp',
    motion: { stiffness: 54, damping: 21, wavePeriod: 8.5, waveAmp: 4.6 },
    ornament: {
      family: 'botanik',
      monogram: 'celenk',
      ayrac: 'nokta',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Gülleri ışıkla açın',
    openingMs: 5200,
  },
  pudra: {
    id: 'pudra',
    name: 'Pudra Bahçesi',
    description: 'Çiçekli kapılar ve mum ışığında bir masal',
    series: 'kapi',
    opening: 'garden',
    tag: 'Bahçe kapısı',
    subtitle: 'Bir ömre açılan bahçe.',
    material: 'Pudra güller · Fildişi · Mum ışığı',
    openingCopy: 'Çiçekli bahçeye açılan zarif kapı ve kesintisiz bir hikâye.',
    cover: '/tema-pudra.webp',
    motion: calm,
    ornament: {
      family: 'botanik',
      monogram: 'celenk',
      ayrac: 'nokta',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Bahçeyi uyandırın',
    openingMs: 3200,
  },
  gulmuhur: {
    id: 'gulmuhur',
    name: 'Gül Mührü',
    description: 'Balmumu mühür ve pamuk kâğıt',
    series: 'zarf',
    opening: 'material',
    tag: 'Mühürlü zarf',
    subtitle: 'Saklanacak bir aşk mektubu.',
    material: 'Gül kurusu · Pamuk kâğıt · Balmumu',
    openingCopy:
      'Balmumu mühür çözülür; kapak açılır, davet kartı zarftan yükselir.',
    cover: '/gulmuhur-paper.webp',
    motion: calm,
    ornament: {
      family: 'botanik',
      monogram: 'halka',
      ayrac: 'nokta',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Mührü çözün',
    openingMs: 3800,
  },
  gulipek: {
    id: 'gulipek',
    name: 'Gül İpek',
    description: 'İpek kurdele · Gül kurusu kâğıt',
    series: 'zarf',
    opening: 'material',
    tag: 'İpek kurdele',
    subtitle: 'İpekten bir başlangıç.',
    material: 'Gül kurusu · İpek kurdele · Pamuk kâğıt',
    openingCopy:
      'Kurdele çözülür, üzerindeki mühürle birlikte kâğıt kapak açılır.',
    cover: '/gulipek-cover.svg',
    motion: calm,
    ornament: {
      family: 'botanik',
      monogram: 'celenk',
      ayrac: 'nokta',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Gülü uyandırın',
    openingMs: 3800,
  },
  sedef: {
    id: 'sedef',
    name: 'Sedef',
    description: 'Sedef yansıması · Katlanan kapak',
    series: 'zarf',
    opening: 'material',
    tag: 'Katlanan sedef',
    subtitle: 'Işığın en zarif hâli.',
    material: 'Sedef · Adaçayı · Gümüş işleme',
    openingCopy:
      'Sedef kapak üzerindeki mühre dokunun; davetiniz bir kitap gibi açılsın.',
    cover: '/sedef-cover.svg',
    motion: calm,
    ornament: {
      family: 'ebru',
      monogram: 'halka',
      ayrac: 'dalga',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Sedefi parlatın',
    openingMs: 3800,
  },
  gecealtini: {
    id: 'gecealtini',
    name: 'Gece Altını',
    description: 'Koyu keten · Gömme altın monogram',
    series: 'zarf',
    opening: 'material',
    tag: 'Altın varak',
    subtitle: 'Geceye yazılmış bir söz.',
    material: 'Koyu keten · Altın varak · İnce botanik',
    openingCopy:
      'Gömme monogram aydınlanır; koyu keten kapak ağır ağır aralanır.',
    cover: '/gecealtini-cover.svg',
    motion: calm,
    ornament: {
      family: 'deco',
      monogram: 'deco',
      ayrac: 'elmas',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Işığı uyandırın',
    openingMs: 3800,
  },
  gece: {
    id: 'gece',
    name: 'Gece Bahçesi',
    description: 'Romantik ve sinematik',
    series: 'klasik',
    opening: 'material',
    tag: 'Romantik gece',
    subtitle: 'Yıldızların altında bir söz.',
    material: 'Gece mavisi · Çiçekler · Altın ışık',
    openingCopy: 'Mühürlü zarfın ardından romantik bir gece bahçesi açılır.',
    cover: '/tema-gece.jpg',
    motion: { stiffness: 58, damping: 20, wavePeriod: 7.5, waveAmp: 6 },
    ornament: {
      family: 'botanik',
      monogram: 'halka',
      ayrac: 'yildiz',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Yıldızı yakın',
    openingMs: 3800,
  },
  inci: {
    id: 'inci',
    name: 'İnci Işıltısı',
    description: 'Zarif ve zamansız',
    series: 'klasik',
    opening: 'material',
    tag: 'Zamansız klasik',
    subtitle: 'Zamansız bir zarafet.',
    material: 'İnci beyazı · Sedef · Yumuşak ışık',
    openingCopy:
      'Zarfınızı açın; inci tonlarında zarif bir daveti deneyimleyin.',
    cover: '/tema-inci.jpg',
    motion: { stiffness: 130, damping: 26, wavePeriod: 9.5, waveAmp: 3 },
    ornament: {
      family: 'botanik',
      monogram: 'celenk',
      ayrac: 'nokta',
      kose: false,
      muhur: true,
    },
    storyTouch: 'İnciyi parlatın',
    openingMs: 3800,
  },
  safak: {
    id: 'safak',
    name: 'Şafak Vakti',
    description: 'Sıcak ve özgür',
    series: 'klasik',
    opening: 'material',
    tag: 'Sıcak ve özgür',
    subtitle: 'Birlikte doğan yeni bir gün.',
    material: 'Şafak tonları · Sıcak ışık · Romantik dokular',
    openingCopy:
      'Mühürden hikâyenize, gün doğumunun sıcak renkleriyle bir yolculuk.',
    cover: '/tema-safak.jpg',
    motion: { stiffness: 46, damping: 14, wavePeriod: 5.5, waveAmp: 8.5 },
    ornament: {
      family: 'deco',
      monogram: 'deco',
      ayrac: 'elmas',
      kose: false,
      muhur: true,
    },
    storyTouch: 'Gün doğumunu başlatın',
    openingMs: 3800,
  },
  cini: {
    id: 'cini',
    name: 'Mavi Çini',
    description: 'Boğaz gecesi ve altın işlemeler',
    series: 'klasik',
    opening: 'material',
    tag: 'Çini işlemeli',
    subtitle: 'İnce işlenmiş bir İstanbul hikâyesi.',
    material: 'Çini mavisi · Altın işleme · Boğaz gecesi',
    openingCopy:
      'Çini motifleriyle bezeli zarf, mavi ve altın bir hikâyeye açılır.',
    cover: '/tema-cini.webp',
    motion: { stiffness: 76, damping: 23, wavePeriod: 8.6, waveAmp: 4.2 },
    ornament: {
      family: 'iznik',
      monogram: 'tugra',
      ayrac: 'yildiz',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Çiniyi keşfedin',
    openingMs: 3800,
  },
  botanik: {
    id: 'botanik',
    name: 'Botanik Vals',
    description: 'Adaçayı, keten ve kır çiçekleri',
    series: 'klasik',
    opening: 'material',
    tag: 'Doğal ve romantik',
    subtitle: 'Doğanın ritminde, birlikte.',
    material: 'Adaçayı · Keten · Kır çiçekleri',
    openingCopy:
      'Zarfın ardından kır çiçekleri ve doğal dokular davetinize eşlik eder.',
    cover: '/tema-botanik.webp',
    motion: { stiffness: 42, damping: 15, wavePeriod: 6.4, waveAmp: 7.2 },
    ornament: {
      family: 'botanik',
      monogram: 'celenk',
      ayrac: 'dalga',
      kose: true,
      muhur: true,
    },
    storyTouch: 'Yaprağı aralayın',
    openingMs: 3800,
  },
  siyahinci: {
    id: 'siyahinci',
    name: 'Siyah İnci',
    description: 'Monokrom ve yüksek moda',
    series: 'klasik',
    opening: 'material',
    tag: 'Monokrom zarafet',
    subtitle: 'Güçlü, yalın, unutulmaz.',
    material: 'Siyah · İnci beyazı · Monokrom detaylar',
    openingCopy:
      'Mühürlü açılışı deneyimleyin; siyah ve beyazın zarif karşıtlığına adım atın.',
    cover: '/tema-siyahinci.webp',
    motion: { stiffness: 105, damping: 28, wavePeriod: 10, waveAmp: 2.8 },
    ornament: {
      family: 'deco',
      monogram: 'elmas',
      ayrac: 'elmas',
      kose: false,
      muhur: true,
    },
    storyTouch: 'İnciyi uyandırın',
    openingMs: 3800,
  },
};

export const seriesLabels: Record<ThemeSeries, string> = {
  kapi: 'Mühürlü Kapılar',
  zarf: 'Zarflar ve Kapaklar',
  klasik: 'Klasik Seçki',
};

export function isTheme(value: unknown): value is Theme {
  return (
    typeof value === 'string' &&
    (THEME_IDS as readonly string[]).includes(value)
  );
}

export function themeDefinition(theme: Theme): ThemeDefinition {
  return themeRegistry[theme] ?? themeRegistry.rolyef;
}

/* Kayıtlı eski bir tema kaldırıldıysa davetiye yine açılsın. */
export function normalizeTheme(value: unknown): Theme {
  if (isTheme(value)) return value;
  return 'rolyef';
}
