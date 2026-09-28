import type { SpeciesDef } from '../game/types';

// Tüm canlı türleri. Süreler saniye cinsindendir.
// Denge notu: satış ≈ fiyat × (2.3 yaygın … 1.8 efsanevi). Üreyen türler yavrularıyla ek kâr sağlar.

const M = 60;
const H = 3600;

export const SPECIES: SpeciesDef[] = [
  // ------------------------------------------------------------------ TATLI SU
  {
    id: 'goldfish', kind: 'fish', water: 'fresh', rarity: 'common', level: 1,
    price: 25, size: 7, bioload: 2, growTime: 4 * M, sell: 60, xp: 1, adultXp: 10,
    temp: [18, 26], minQ: 45, diet: 'omni', temper: 'peaceful', zone: 'mid', speed: 0.9,
    hunger: 15 * M, beauty: 4, traits: [{ id: 'hardy' }],
    look: {
      body: 'oval', h: 0.52, c1: '#ff7b1a', c2: '#ffc46b', fin: 'rgba(255,140,50,0.78)',
      finEdge: 'rgba(255,225,170,0.9)', tail: 'split', tailSize: 0.62, dorsal: 'tall', dorsalSize: 0.5,
      anal: 'small', pelvic: 'small', eye: 1.05, shine: 0.45,
      pattern: [{ type: 'scales', color: 'rgba(255,232,160,0.35)' }],
    },
    variants: [
      { id: 'sakura', name: { tr: 'Sakura', en: 'Sakura' }, mult: 2.5, w: 0,
        look: { c1: '#ffd6e0', c2: '#fff5f8', fin: 'rgba(255,170,200,0.85)', finEdge: 'rgba(255,255,255,0.95)',
          pattern: [{ type: 'patches', color: '#ff8fb1', n: 3 }, { type: 'scales', color: 'rgba(255,255,255,0.35)' }] } },
    ],
    name: { tr: 'Japon Balığı', en: 'Goldfish' }, latin: 'Carassius auratus',
    fact: {
      tr: 'İyi bakılan japon balıkları 20 yıldan fazla yaşayabilir ve sahiplerini tanıyabilir.',
      en: 'Well-kept goldfish can live over 20 years and can recognize their owners.',
    },
  },
  {
    id: 'zebra', kind: 'fish', water: 'fresh', rarity: 'common', level: 1,
    price: 15, size: 5, bioload: 1, growTime: 3 * M, sell: 36, xp: 1, adultXp: 6,
    temp: [20, 27], minQ: 40, diet: 'omni', temper: 'peaceful', zone: 'top', speed: 1.6,
    hunger: 12 * M, beauty: 2, school: 4, traits: [{ id: 'schooling' }, { id: 'hardy' }],
    look: {
      body: 'torpedo', h: 0.27, c1: '#c9d4e2', c2: '#f4f6fa', fin: 'rgba(205,218,238,0.6)',
      tail: 'fork', tailSize: 0.45, dorsal: 'small', dorsalSize: 0.3, anal: 'small', shine: 0.3,
      pattern: [{ type: 'stripesH', color: '#2c4f9e', n: 4, w: 0.045 }],
    },
    name: { tr: 'Zebra Danio', en: 'Zebra Danio' }, latin: 'Danio rerio',
    fact: {
      tr: 'Zebra danio kalp ve yüzgeç dokusunu yenileyebildiği için bilim dünyasının yıldızıdır.',
      en: 'Zebra danios can regenerate heart and fin tissue, making them stars of science.',
    },
  },
  {
    id: 'neon', kind: 'fish', water: 'fresh', rarity: 'common', level: 2,
    price: 18, size: 4, bioload: 1, growTime: 3.5 * M, sell: 42, xp: 1, adultXp: 7,
    temp: [22, 27], minQ: 55, diet: 'omni', temper: 'peaceful', zone: 'mid', speed: 1.3,
    hunger: 12 * M, beauty: 4, school: 5, traits: [{ id: 'schooling' }],
    look: {
      body: 'torpedo', h: 0.3, c1: '#7f8ca0', c2: '#e9edf3', fin: 'rgba(225,230,240,0.35)',
      tail: 'fork', tailSize: 0.4, dorsal: 'small', dorsalSize: 0.28, anal: 'small', eye: 1.15,
      pattern: [
        { type: 'rearColor', color: '#e5163f', w: 0.5, a: 0.95, part: 'lower' },
        { type: 'neon', color: '#1ee3ff' },
      ],
    },
    variants: [
      { id: 'frost', name: { tr: 'Buz', en: 'Frost' }, mult: 2.5, w: 0,
        look: { c1: '#dbeafe', c2: '#ffffff', shine: 0.8, glow: '#bae6fd',
          pattern: [{ type: 'rearColor', color: '#93c5fd', w: 0.5, a: 0.9, part: 'lower' }, { type: 'neon', color: '#f0f9ff' }] } },
    ],
    name: { tr: 'Neon Tetra', en: 'Neon Tetra' }, latin: 'Paracheirodon innesi',
    fact: {
      tr: 'Neon tetranın parlak mavi şeridi, ışığı yansıtan özel hücrelerden gelir.',
      en: "The neon tetra's glowing stripe comes from special light-reflecting cells.",
    },
  },
  {
    id: 'mysterySnail', kind: 'snail', water: 'fresh', rarity: 'common', level: 2,
    price: 30, size: 4, bioload: 0.5, growTime: 6 * M, sell: 66, xp: 1, adultXp: 6,
    temp: [20, 28], minQ: 45, diet: 'herbi', temper: 'peaceful', zone: 'bottom', speed: 0.15,
    hunger: 40 * M, beauty: 3, traits: [{ id: 'algaeEater', v: 0.8 }, { id: 'scavenger', v: 0.8 }],
    look: { c1: '#e6a817', c2: '#f7d774', c3: '#4b4136' },
    name: { tr: 'Gizemli Salyangoz', en: 'Mystery Snail' }, latin: 'Pomacea bridgesii',
    fact: {
      tr: 'Gizemli salyangozlar yüzeyden hava almak için şnorkel benzeri bir sifon kullanır.',
      en: 'Mystery snails use a snorkel-like siphon to breathe air from the surface.',
    },
  },
  {
    id: 'platy', kind: 'fish', water: 'fresh', rarity: 'common', level: 3,
    price: 35, size: 5, bioload: 1, growTime: 5 * M, sell: 82, xp: 1.5, adultXp: 10,
    temp: [20, 27], minQ: 45, diet: 'omni', temper: 'peaceful', zone: 'mid', speed: 1.0,
    hunger: 14 * M, beauty: 4, traits: [{ id: 'hardy' }],
    look: {
      body: 'oval', h: 0.42, c1: '#ff4a1c', c2: '#ffa24d', fin: 'rgba(255,110,50,0.8)',
      tail: 'round', tailSize: 0.42, dorsal: 'small', dorsalSize: 0.36, anal: 'small', shine: 0.3,
      pattern: [{ type: 'rearColor', color: '#1d1d22', w: 0.18, a: 0.9 }],
    },
    name: { tr: 'Plati', en: 'Platy' }, latin: 'Xiphophorus maculatus',
    fact: {
      tr: 'Platiler canlı doğurur; yavrular doğar doğmaz yüzebilir.',
      en: 'Platies are livebearers; their fry can swim right after birth.',
    },
  },
  {
    id: 'cory', kind: 'fish', water: 'fresh', rarity: 'uncommon', level: 3,
    price: 45, size: 5, bioload: 1, growTime: 6 * M, sell: 100, xp: 1.5, adultXp: 10,
    temp: [22, 27], minQ: 50, diet: 'omni', temper: 'peaceful', zone: 'bottom', speed: 0.8,
    hunger: 15 * M, beauty: 3, school: 3,
    traits: [{ id: 'scavenger', v: 1.0 }, { id: 'schooling' }],
    look: {
      body: 'cory', h: 0.42, c1: '#d8cdbd', c2: '#f3ede3', fin: 'rgba(230,220,205,0.6)',
      tail: 'fork', tailSize: 0.4, dorsal: 'tall', dorsalSize: 0.45, anal: 'small', pelvic: 'small',
      barbels: true, eye: 1.1, pattern: [{ type: 'patches', color: '#1f1f1f', n: 3 }],
    },
    name: { tr: 'Koridoras', en: 'Corydoras' }, latin: 'Corydoras panda',
    fact: {
      tr: 'Koridoraslar zaman zaman yüzeye fırlayıp bağırsaklarıyla hava soluyabilir.',
      en: 'Corydoras sometimes dart to the surface to gulp air, absorbed through their gut.',
    },
  },
  {
    id: 'cardinal', kind: 'fish', water: 'fresh', rarity: 'uncommon', level: 3,
    price: 55, size: 4.5, bioload: 1, growTime: 5 * M, sell: 125, xp: 1.5, adultXp: 12,
    temp: [23, 29], minQ: 60, diet: 'omni', temper: 'peaceful', zone: 'mid', speed: 1.3,
    hunger: 12 * M, beauty: 6, school: 5, traits: [{ id: 'xpBoost', v: 0.4 }, { id: 'schooling' }],
    look: {
      body: 'torpedo', h: 0.3, c1: '#7b889c', c2: '#e3e8f0', fin: 'rgba(225,230,240,0.35)',
      tail: 'fork', tailSize: 0.4, dorsal: 'small', dorsalSize: 0.28, anal: 'small', eye: 1.15,
      pattern: [
        { type: 'rearColor', color: '#ff1a3c', w: 0.92, a: 0.95, part: 'lower' },
        { type: 'neon', color: '#22e8ff' },
      ],
    },
    name: { tr: 'Kardinal Tetra', en: 'Cardinal Tetra' }, latin: 'Paracheirodon axelrodi',
    fact: {
      tr: 'Kardinal tetranın kırmızısı tüm karın boyunca uzanır; bu onu neondan ayırır.',
      en: 'Cardinal tetras have red along the entire belly, which sets them apart from neons.',
    },
  },
  {
    id: 'guppy', kind: 'fish', water: 'fresh', rarity: 'uncommon', level: 4,
    price: 60, size: 4.5, bioload: 1, growTime: 6 * M, sell: 130, xp: 2, adultXp: 14,
    temp: [22, 28], minQ: 50, diet: 'omni', temper: 'peaceful', zone: 'top', speed: 1.2,
    hunger: 13 * M, beauty: 6, traits: [{ id: 'longFin' }],
    breed: {
      method: 'live', needs: [], minHappy: 60, minQ: 60, temp: [24, 28], time: 5 * M, hatch: 0,
      brood: [2, 4], cooldown: 10 * M, mutation: 0.08,
    },
    look: {
      body: 'torpedo', h: 0.3, c1: '#9aa7b0', c2: '#dfe6ea', fin: 'rgba(255,120,40,0.9)',
      finEdge: 'rgba(40,120,255,0.85)', tail: 'veil', tailSize: 1.05, dorsal: 'tall', dorsalSize: 0.45,
      anal: 'small', eye: 1.1, pattern: [{ type: 'dots', color: '#ff8c2a', n: 6 }],
    },
    lookF: {
      h: 0.36, c1: '#8b979f', fin: 'rgba(170,180,190,0.55)', finEdge: 'rgba(170,180,190,0.6)',
      tail: 'round', tailSize: 0.42, dorsal: 'small', dorsalSize: 0.3, pattern: [],
    },
    variants: [
      { id: 'sunset', name: { tr: 'Gün Batımı', en: 'Sunset' }, mult: 2.5, w: 0,
        look: { c1: '#ffb347', c2: '#ffe0a3', fin: 'rgba(255,80,60,0.92)', finEdge: 'rgba(255,215,0,0.95)',
          pattern: [{ type: 'rearColor', color: '#ff5e62', w: 0.5 }] } },
      { id: 'cobra', name: { tr: 'Kobra', en: 'Cobra' }, mult: 2.5, w: 5,
        look: { c1: '#b9c46a', fin: 'rgba(210,220,70,0.9)', pattern: [{ type: 'marble', color: '#2f3a17' }] } },
      { id: 'tuxedo', name: { tr: 'Smokin', en: 'Tuxedo' }, mult: 2, w: 6,
        look: { fin: 'rgba(80,140,255,0.9)', pattern: [{ type: 'rearColor', color: '#16161a', w: 0.55 }] } },
      { id: 'albinoRed', name: { tr: 'Albino Kırmızı', en: 'Albino Red' }, mult: 3.5, w: 2,
        look: { c1: '#f6e3dc', c2: '#fff6f2', fin: 'rgba(235,30,50,0.95)', eyeColor: '#e11d48', pattern: [] } },
    ],
    name: { tr: 'Lepistes', en: 'Guppy' }, latin: 'Poecilia reticulata',
    fact: {
      tr: 'Bir dişi lepistes tek bir çiftleşmeden sonra aylarca yavru doğurabilir.',
      en: 'A female guppy can give birth for months after a single mating.',
    },
  },
  {
    id: 'tigerbarb', kind: 'fish', water: 'fresh', rarity: 'common', level: 4,
    price: 40, size: 5, bioload: 1, growTime: 5 * M, sell: 95, xp: 1.5, adultXp: 10,
    temp: [22, 27], minQ: 50, diet: 'omni', temper: 'semi', zone: 'mid', speed: 1.4,
    hunger: 13 * M, beauty: 4, school: 5, traits: [{ id: 'finNipper' }, { id: 'schooling' }],
    look: {
      body: 'deep', h: 0.55, c1: '#f5c86b', c2: '#fff1cf', fin: 'rgba(230,60,40,0.85)',
      finEdge: '#ff3b2f', tail: 'fork', tailSize: 0.45, dorsal: 'small', dorsalSize: 0.4, anal: 'small',
      lips: '#ff4d3d', pattern: [{ type: 'stripesV', color: '#1b1b1b', n: 4, w: 0.07 }],
    },
    name: { tr: 'Sumatra', en: 'Tiger Barb' }, latin: 'Puntigrus tetrazona',
    fact: {
      tr: 'Sumatralar küçük gruplarda tutulursa diğer balıkların yüzgeçlerini ısırabilir.',
      en: 'Tiger barbs kept in small groups may nip the fins of other fish.',
    },
  },
  {
    id: 'nerite', kind: 'snail', water: 'fresh', rarity: 'uncommon', level: 4,
    price: 55, size: 2.8, bioload: 0.5, growTime: 8 * M, sell: 118, xp: 1, adultXp: 8,
    temp: [20, 28], minQ: 50, diet: 'herbi', temper: 'peaceful', zone: 'bottom', speed: 0.12,
    hunger: 45 * M, beauty: 3, traits: [{ id: 'algaeEater', v: 1.6 }],
    look: { c1: '#3b2f1e', c2: '#f0c75e', c3: '#6b6b6b', mark: 'zebra' },
    name: { tr: 'Zebra Nerit', en: 'Zebra Nerite' }, latin: 'Neritina natalensis',
    fact: {
      tr: 'Nerit salyangozları tatlı suda çoğalamaz; bu yüzden akvaryumu istila etmez.',
      en: "Nerite snails can't breed in freshwater, so they never overrun a tank.",
    },
  },
  {
    id: 'ranchu', kind: 'fish', water: 'fresh', rarity: 'uncommon', level: 5,
    price: 180, size: 8, bioload: 2, growTime: 12 * M, sell: 390, xp: 3, adultXp: 30,
    temp: [18, 25], minQ: 55, diet: 'omni', temper: 'peaceful', zone: 'mid', speed: 0.5,
    hunger: 18 * M, beauty: 9, traits: [{ id: 'xpBoost', v: 0.5 }],
    look: {
      body: 'round', h: 0.72, c1: '#ff4a26', c2: '#fff1e8', fin: 'rgba(255,90,60,0.75)',
      tail: 'split', tailSize: 0.5, dorsal: 'none', dorsalSize: 0, anal: 'small', pelvic: 'small',
      hump: 0.28, eye: 0.95, pattern: [{ type: 'patches', color: '#ffffff', n: 2 }],
    },
    name: { tr: 'Aslan Başlı Japon', en: 'Lionhead Goldfish' }, latin: 'Carassius auratus (Ranchu)',
    fact: {
      tr: "Aslan başlıların kafasındaki kabarık doku 'wen' olarak adlandırılır.",
      en: "The fleshy growth on a lionhead's head is called a 'wen'.",
    },
  },
  {
    id: 'pleco', kind: 'fish', water: 'fresh', rarity: 'uncommon', level: 5,
    price: 90, size: 10, bioload: 2, growTime: 12 * M, sell: 200, xp: 2, adultXp: 20,
    temp: [22, 28], minQ: 50, diet: 'herbi', temper: 'peaceful', zone: 'bottom', speed: 0.5,
    hunger: 20 * M, beauty: 3, traits: [{ id: 'algaeEater', v: 1.5 }, { id: 'nocturnal' }],
    look: {
      body: 'pleco', h: 0.3, c1: '#4a3a2b', c2: '#6d5a45', fin: 'rgba(80,62,45,0.9)',
      tail: 'fork', tailSize: 0.35, dorsal: 'sail', dorsalSize: 0.5, anal: 'small', pelvic: 'small',
      eye: 0.8, barbels: true, pattern: [{ type: 'dots', color: '#d8c7a0', n: 26 }],
    },
    name: { tr: 'Vantuz Balığı', en: 'Bristlenose Pleco' }, latin: 'Ancistrus sp.',
    fact: {
      tr: 'Vantuz balığının ağzı bir vantuz gibi çalışır ve yosunları kazır.',
      en: "A pleco's mouth works like a suction cup and scrapes off algae.",
    },
  },
  {
    id: 'cherryShrimp', kind: 'shrimp', water: 'fresh', rarity: 'uncommon', level: 5,
    price: 40, size: 2.6, bioload: 0.5, growTime: 10 * M, sell: 90, xp: 1, adultXp: 8,
    temp: [20, 28], minQ: 60, diet: 'omni', temper: 'peaceful', zone: 'bottom', speed: 0.4,
    hunger: 25 * M, beauty: 3, traits: [{ id: 'scavenger', v: 0.5 }, { id: 'algaeEater', v: 0.3 }],
    breed: {
      method: 'eggs', needs: ['moss'], minHappy: 60, minQ: 70, temp: [22, 27], time: 10 * M, hatch: 10 * M,
      brood: [2, 5], cooldown: 15 * M, mutation: 0.1,
    },
    look: { c1: '#dc2626', c2: '#f87171', c3: 'rgba(255,255,255,0.35)' },
    variants: [
      { id: 'blueDream', name: { tr: 'Mavi Rüya', en: 'Blue Dream' }, mult: 3, w: 3, look: { c1: '#1d4ed8', c2: '#60a5fa' } },
      { id: 'yellow', name: { tr: 'Sarı', en: 'Yellow' }, mult: 2, w: 6, look: { c1: '#eab308', c2: '#fde047' } },
      { id: 'chocolate', name: { tr: 'Çikolata', en: 'Chocolate' }, mult: 2.5, w: 4, look: { c1: '#5b3a29', c2: '#8b5e3c' } },
      { id: 'rili', name: { tr: 'Rili', en: 'Rili' }, mult: 3.5, w: 2, look: { c1: '#dc2626', c2: '#f5f5f4', mark: 'stripes' } },
    ],
    name: { tr: 'Kiraz Karides', en: 'Cherry Shrimp' }, latin: 'Neocaridina davidi',
    fact: {
      tr: 'Kiraz karidesleri yosun ve artık yem yiyerek akvaryumu temiz tutar.',
      en: 'Cherry shrimp keep tanks clean by eating algae and leftover food.',
    },
  },
  {
    id: 'betta', kind: 'fish', water: 'fresh', rarity: 'uncommon', level: 6,
    price: 150, size: 6.5, bioload: 1, growTime: 10 * M, sell: 330, xp: 3, adultXp: 30,
    temp: [25, 30], minQ: 60, diet: 'carni', temper: 'semi', zone: 'top', speed: 0.7,
    hunger: 18 * M, beauty: 12, traits: [{ id: 'longFin' }, { id: 'rivalMales' }],
    breed: {
      method: 'nest', needs: ['floating'], minHappy: 70, minQ: 70, temp: [26, 29], time: 15 * M, hatch: 5 * M,
      brood: [1, 3], cooldown: 20 * M, mutation: 0.1,
    },
    look: {
      body: 'betta', h: 0.3, c1: '#c1121f', c2: '#8f0a16', fin: 'rgba(220,20,45,0.85)',
      finEdge: 'rgba(255,90,120,0.9)', tail: 'veil', tailSize: 1.35, dorsal: 'long', dorsalSize: 0.8,
      anal: 'long', analSize: 0.95, pelvic: 'long', eye: 1.0, shine: 0.35,
    },
    lookF: {
      c1: '#b8323e', fin: 'rgba(200,50,60,0.7)', finEdge: 'rgba(220,90,100,0.7)', tail: 'round', tailSize: 0.45,
      dorsal: 'small', dorsalSize: 0.35, anal: 'small', analSize: 0.4, pelvic: 'small',
    },
    variants: [
      { id: 'pumpkin', name: { tr: 'Balkabağı', en: 'Pumpkin' }, mult: 3, w: 0,
        look: { c1: '#ff7a00', c2: '#e05a00', fin: 'rgba(255,120,0,0.9)', finEdge: 'rgba(25,20,20,0.95)',
          pattern: [{ type: 'patches', color: '#1a1410', n: 2 }] } },
      { id: 'koi', name: { tr: 'Koi', en: 'Koi' }, mult: 3, w: 5,
        look: { c1: '#fff4ea', c2: '#ffffff', fin: 'rgba(255,120,60,0.85)',
          pattern: [{ type: 'patches', color: '#ff4f1f', n: 3 }, { type: 'patches', color: '#1a1a1a', n: 2 }] } },
      { id: 'galaxy', name: { tr: 'Galaksi', en: 'Galaxy' }, mult: 4, w: 3,
        look: { c1: '#1c2d6b', c2: '#0f1a45', fin: 'rgba(40,70,200,0.9)', finEdge: 'rgba(150,200,255,0.9)',
          pattern: [{ type: 'dots', color: '#e6f0ff', n: 30 }] } },
      { id: 'blackOrchid', name: { tr: 'Siyah Orkide', en: 'Black Orchid' }, mult: 3.5, w: 3,
        look: { c1: '#241133', c2: '#150a20', fin: 'rgba(70,30,110,0.92)', finEdge: 'rgba(120,160,255,0.8)' } },
      { id: 'dragon', name: { tr: 'Ejder Pulu', en: 'Dragon Scale' }, mult: 5, w: 1,
        look: { c1: '#e9e4df', c2: '#cc2936', fin: 'rgba(200,30,40,0.9)', shine: 0.9,
          pattern: [{ type: 'scales', color: 'rgba(255,255,255,0.6)' }] } },
    ],
    name: { tr: 'Beta', en: 'Betta' }, latin: 'Betta splendens',
    fact: {
      tr: 'Erkek betalar yavruları için köpükten yuva yapar ve yumurtaları korur.',
      en: 'Male bettas build bubble nests and guard the eggs.',
    },
  },
  {
    id: 'amano', kind: 'shrimp', water: 'fresh', rarity: 'uncommon', level: 6,
    price: 80, size: 4, bioload: 0.5, growTime: 15 * M, sell: 172, xp: 1.5, adultXp: 12,
    temp: [20, 28], minQ: 55, diet: 'herbi', temper: 'peaceful', zone: 'bottom', speed: 0.5,
    hunger: 30 * M, beauty: 2, traits: [{ id: 'algaeEater', v: 1.2 }, { id: 'scavenger', v: 0.5 }],
    look: { c1: 'rgba(170,165,150,0.8)', c2: 'rgba(215,212,200,0.65)', c3: '#5b4a3a', mark: 'dots' },
    name: { tr: 'Amano Karidesi', en: 'Amano Shrimp' }, latin: 'Caridina multidentata',
    fact: {
      tr: 'Amano karidesleri yosun yeme konusunda en çalışkan karideslerdir.',
      en: 'Amano shrimp are among the hardest-working algae eaters.',
    },
  },
  {
    id: 'gourami', kind: 'fish', water: 'fresh', rarity: 'uncommon', level: 7,
    price: 220, size: 10, bioload: 2, growTime: 15 * M, sell: 470, xp: 3, adultXp: 35,
    temp: [24, 29], minQ: 55, diet: 'omni', temper: 'peaceful', zone: 'mid', speed: 0.6,
    hunger: 20 * M, beauty: 10, traits: [{ id: 'xpAura', v: 0.08 }],
    look: {
      body: 'oval', h: 0.45, c1: '#b4a48f', c2: '#ffd2a8', fin: 'rgba(190,175,150,0.7)',
      tail: 'fork', tailSize: 0.45, dorsal: 'small', dorsalSize: 0.35, anal: 'long', analSize: 0.6,
      pelvic: 'thread', shine: 0.4,
      pattern: [{ type: 'dots', color: '#fff8ee', n: 40 }, { type: 'lateral', color: '#3d3326' }],
    },
    name: { tr: 'İnci Gurami', en: 'Pearl Gourami' }, latin: 'Trichopodus leerii',
    fact: {
      tr: 'Guramiler labirent organı sayesinde yüzeyden hava soluyabilir.',
      en: 'Gouramis can breathe air from the surface thanks to their labyrinth organ.',
    },
  },
  {
    id: 'angel', kind: 'fish', water: 'fresh', rarity: 'rare', level: 8,
    price: 450, size: 12, bioload: 3, growTime: 30 * M, sell: 960, xp: 4, adultXp: 80,
    temp: [24, 30], minQ: 65, diet: 'omni', temper: 'semi', zone: 'mid', speed: 0.6,
    hunger: 25 * M, beauty: 16, minTier: 1, traits: [{ id: 'longFin' }],
    breed: {
      method: 'eggs', needs: ['broadleaf', 'flat'], minHappy: 70, minQ: 75, temp: [26, 29], time: 30 * M,
      hatch: 10 * M, brood: [1, 3], cooldown: 40 * M, mutation: 0.07,
    },
    look: {
      body: 'deep', h: 0.75, c1: '#dfe3e8', c2: '#f6f7f9', fin: 'rgba(225,230,236,0.6)',
      tail: 'lyre', tailSize: 0.6, dorsal: 'sail', dorsalSize: 1.3, anal: 'tall', analSize: 1.3,
      pelvic: 'thread', shine: 0.5, pattern: [{ type: 'stripesV', color: '#1c1f24', n: 3, w: 0.07 }],
    },
    variants: [
      { id: 'koi', name: { tr: 'Koi', en: 'Koi' }, mult: 3, w: 4,
        look: { c1: '#fff2e0', pattern: [{ type: 'patches', color: '#ff7a1f', n: 2 }, { type: 'patches', color: '#222', n: 2 }] } },
      { id: 'platinum', name: { tr: 'Platin', en: 'Platinum' }, mult: 4, w: 2,
        look: { c1: '#fbfbff', c2: '#ffffff', fin: 'rgba(255,255,255,0.7)', shine: 1, pattern: [] } },
      { id: 'marble', name: { tr: 'Mermer', en: 'Marble' }, mult: 2.5, w: 5,
        look: { pattern: [{ type: 'marble', color: '#1d1d1d' }] } },
    ],
    name: { tr: 'Melek Balığı', en: 'Angelfish' }, latin: 'Pterophyllum scalare',
    fact: {
      tr: 'Melek balıkları yumurtalarını geniş yapraklara veya düz taşlara bırakır.',
      en: 'Angelfish lay their eggs on broad leaves or flat stones.',
    },
  },
  {
    id: 'adf', kind: 'frog', water: 'fresh', rarity: 'rare', level: 9,
    price: 350, size: 4.5, bioload: 1, growTime: 30 * M, sell: 760, xp: 4, adultXp: 60,
    temp: [22, 28], minQ: 60, diet: 'carni', temper: 'peaceful', zone: 'bottom', speed: 0.4,
    hunger: 25 * M, beauty: 10, traits: [],
    look: { c1: '#7c6f57', c2: '#a39377', c3: '#3f3a2e', mark: 'dots' },
    name: { tr: 'Cüce Kurbağa', en: 'Dwarf Frog' }, latin: 'Hymenochirus boettgeri',
    fact: {
      tr: 'Cüce kurbağalar tamamen suda yaşar ama nefes almak için yüzeye çıkar.',
      en: 'Dwarf frogs live fully underwater but swim up to breathe.',
    },
  },
  {
    id: 'rainbow', kind: 'fish', water: 'fresh', rarity: 'rare', level: 10,
    price: 700, size: 9, bioload: 2, growTime: 35 * M, sell: 1450, xp: 5, adultXp: 100,
    temp: [24, 29], minQ: 60, diet: 'omni', temper: 'peaceful', zone: 'mid', speed: 1.1,
    hunger: 20 * M, beauty: 14, school: 3, traits: [{ id: 'fastGrow', v: 0.35 }, { id: 'schooling' }],
    look: {
      body: 'deep', h: 0.5, c1: '#2b59c3', c2: '#a9c2ff', fin: 'rgba(255,120,40,0.8)',
      tail: 'fork', tailSize: 0.45, dorsal: 'small', dorsalSize: 0.35, anal: 'long', analSize: 0.5, shine: 0.8,
      pattern: [{ type: 'rearColor', color: '#ff7a1a', w: 0.5, a: 0.95 }],
    },
    name: { tr: 'Gökkuşağı Balığı', en: 'Rainbowfish' }, latin: 'Melanotaenia boesemani',
    fact: {
      tr: 'Gökkuşağı balıklarının renkleri sabah saatlerinde en parlak halini alır.',
      en: 'Rainbowfish show their brightest colors in the morning.',
    },
  },
  {
    id: 'ram', kind: 'fish', water: 'fresh', rarity: 'rare', level: 11,
    price: 800, size: 6, bioload: 1, growTime: 40 * M, sell: 1650, xp: 5, adultXp: 110,
    temp: [26, 30], minQ: 75, diet: 'omni', temper: 'peaceful', zone: 'bottom', speed: 0.7,
    hunger: 20 * M, beauty: 14, traits: [{ id: 'shy' }],
    breed: {
      method: 'eggs', needs: ['flat'], minHappy: 75, minQ: 85, temp: [27, 30], time: 40 * M, hatch: 15 * M,
      brood: [1, 3], cooldown: 50 * M, mutation: 0.08,
    },
    look: {
      body: 'oval', h: 0.5, c1: '#ffcf5a', c2: '#fff3c9', fin: 'rgba(255,140,70,0.75)',
      finEdge: 'rgba(80,160,255,0.8)', tail: 'round', tailSize: 0.42, dorsal: 'tall', dorsalSize: 0.5,
      anal: 'small', pelvic: 'long', eyeColor: '#e11d48', shine: 0.5,
      pattern: [{ type: 'dots', color: '#4aa3ff', n: 20 }, { type: 'mask', color: '#1c1c1c' }, { type: 'dorsalSpot', color: '#111' }],
    },
    variants: [
      { id: 'electric', name: { tr: 'Elektrik Mavisi', en: 'Electric Blue' }, mult: 3, w: 3,
        look: { c1: '#1e5eff', c2: '#6aa0ff', fin: 'rgba(40,90,255,0.8)', pattern: [{ type: 'dots', color: '#bfe0ff', n: 20 }] } },
      { id: 'gold', name: { tr: 'Altın', en: 'Gold' }, mult: 2.5, w: 5, look: { c1: '#ffc300', c2: '#ffe680', pattern: [] } },
      { id: 'balloon', name: { tr: 'Balon', en: 'Balloon' }, mult: 2, w: 5, look: { h: 0.62 } },
    ],
    name: { tr: 'Ramirezi', en: 'German Blue Ram' }, latin: 'Mikrogeophagus ramirezi',
    fact: {
      tr: 'Ramirezi çiftleri yavrularını birlikte büyük bir özenle korur.',
      en: 'Ram pairs guard their fry together with great care.',
    },
  },
  {
    id: 'blueCray', kind: 'crayfish', water: 'fresh', rarity: 'rare', level: 12,
    price: 900, size: 10, bioload: 2, growTime: 50 * M, sell: 1900, xp: 6, adultXp: 120,
    temp: [20, 27], minQ: 60, diet: 'omni', temper: 'aggressive', zone: 'bottom', speed: 0.4,
    hunger: 30 * M, beauty: 14, traits: [{ id: 'scavenger', v: 1.0 }, { id: 'territorial' }],
    look: { c1: '#1e40af', c2: '#3b82f6', c3: '#93c5fd' },
    name: { tr: 'Mavi Kerevit', en: 'Blue Crayfish' }, latin: 'Procambarus alleni',
    fact: {
      tr: 'Mavi kerevitler büyümek için kabuk değiştirir ve eski kabuğu yer.',
      en: 'Blue crayfish molt to grow, and then eat their old shell.',
    },
  },
  {
    id: 'oscar', kind: 'fish', water: 'fresh', rarity: 'rare', level: 13,
    price: 1400, size: 22, bioload: 5, growTime: 1 * H, sell: 2900, xp: 7, adultXp: 180,
    temp: [23, 28], minQ: 65, diet: 'carni', temper: 'aggressive', zone: 'mid', speed: 0.6,
    hunger: 30 * M, beauty: 12, minTier: 3, traits: [{ id: 'territorial' }],
    look: {
      body: 'oval', h: 0.5, c1: '#3b3430', c2: '#5c4c3d', fin: 'rgba(60,50,45,0.85)',
      tail: 'round', tailSize: 0.45, dorsal: 'long', dorsalSize: 0.4, anal: 'long', analSize: 0.4,
      eye: 0.9, lips: '#4a3d33',
      pattern: [{ type: 'marble', color: '#ff7a1a', a: 0.9 }, { type: 'tailSpot', color: '#ff5a1a' }],
    },
    name: { tr: 'Oskar', en: 'Oscar' }, latin: 'Astronotus ocellatus',
    fact: {
      tr: 'Oskarlar sahiplerini tanıyıp onlara tepki verebilen zeki balıklardır.',
      en: 'Oscars are smart fish that can recognize and react to their owners.',
    },
  },
  {
    id: 'discus', kind: 'fish', water: 'fresh', rarity: 'epic', level: 15,
    price: 4500, size: 16, bioload: 4, growTime: 2 * H, sell: 8800, xp: 10, adultXp: 350,
    temp: [28, 31], minQ: 85, diet: 'carni', temper: 'peaceful', zone: 'mid', speed: 0.5,
    hunger: 35 * M, beauty: 30, minTier: 2, traits: [{ id: 'shy' }],
    breed: {
      method: 'eggs', needs: ['flat', 'broadleaf'], minHappy: 80, minQ: 90, temp: [28, 31], time: 90 * M,
      hatch: 30 * M, brood: [1, 2], cooldown: 2 * H, mutation: 0.1,
    },
    look: {
      body: 'disc', h: 0.95, c1: '#c2410c', c2: '#ea580c', fin: 'rgba(200,80,30,0.75)',
      finEdge: 'rgba(80,200,255,0.8)', tail: 'fan', tailSize: 0.35, dorsal: 'long', dorsalSize: 0.28,
      anal: 'long', analSize: 0.28, pelvic: 'small', eyeColor: '#e11d48', shine: 0.4,
      pattern: [{ type: 'waves', color: '#38bdf8', n: 9 }, { type: 'stripesV', color: 'rgba(80,30,10,0.35)', n: 9, w: 0.02 }],
    },
    variants: [
      { id: 'pigeon', name: { tr: 'Güvercin Kanı', en: 'Pigeon Blood' }, mult: 2.5, w: 5,
        look: { c1: '#fff1dc', c2: '#ffe4c2', pattern: [{ type: 'waves', color: '#e0431b', n: 9 }] } },
      { id: 'blueDiamond', name: { tr: 'Mavi Elmas', en: 'Blue Diamond' }, mult: 3.5, w: 3,
        look: { c1: '#2563eb', c2: '#60a5fa', shine: 0.8, pattern: [] } },
      { id: 'leopard', name: { tr: 'Leopar', en: 'Leopard' }, mult: 3, w: 3,
        look: { c1: '#fff0dd', c2: '#ffe8cc', pattern: [{ type: 'spots', color: '#e0301e', n: 40 }] } },
    ],
    name: { tr: 'Diskus', en: 'Discus' }, latin: 'Symphysodon aequifasciatus',
    fact: {
      tr: 'Diskus yavruları ilk günlerinde ebeveynlerinin derisindeki özel salgıyla beslenir.',
      en: "Discus fry feed on a special mucus from their parents' skin.",
    },
  },
  {
    id: 'flowerhorn', kind: 'fish', water: 'fresh', rarity: 'epic', level: 17,
    price: 6500, size: 20, bioload: 5, growTime: 2.5 * H, sell: 12500, xp: 14, adultXp: 500,
    temp: [26, 30], minQ: 70, diet: 'carni', temper: 'aggressive', zone: 'mid', speed: 0.6,
    hunger: 40 * M, beauty: 26, minTier: 3, traits: [{ id: 'xpAura', v: 0.15 }, { id: 'territorial' }],
    breed: {
      method: 'eggs', needs: ['cave', 'flat'], minHappy: 75, minQ: 80, temp: [27, 30], time: 90 * M,
      hatch: 40 * M, brood: [1, 2], cooldown: 2.5 * H, mutation: 0.12,
    },
    look: {
      body: 'oval', h: 0.55, c1: '#d62828', c2: '#ffb4a2', fin: 'rgba(210,40,50,0.8)',
      finEdge: 'rgba(80,190,255,0.7)', tail: 'round', tailSize: 0.45, dorsal: 'long', dorsalSize: 0.45,
      anal: 'long', analSize: 0.45, pelvic: 'long', hump: 0.38, eyeColor: '#ef4444', shine: 0.5,
      pattern: [{ type: 'lateral', color: '#1a1a1a', w: 0.08 }, { type: 'dots', color: '#dbeafe', n: 30 }],
    },
    variants: [
      { id: 'kamfa', name: { tr: 'Kamfa', en: 'Kamfa' }, mult: 2.5, w: 5, look: { c1: '#e85d04', hump: 0.5 } },
      { id: 'redDragon', name: { tr: 'Kızıl Ejder', en: 'Red Dragon' }, mult: 4, w: 2, look: { c1: '#9b0000', c2: '#e11d48' } },
      { id: 'pearlScale', name: { tr: 'İnci Pul', en: 'Pearl Scale' }, mult: 3, w: 3,
        look: { pattern: [{ type: 'dots', color: '#ffffff', n: 60 }] } },
    ],
    name: { tr: 'Flowerhorn', en: 'Flowerhorn' }, latin: 'Cichlasoma hibrit',
    fact: {
      tr: "Flowerhorn'un başındaki tümseğe 'kok' denir ve şans getirdiğine inanılır.",
      en: "The flowerhorn's head hump is called a 'kok' and is believed to bring luck.",
    },
  },
  {
    id: 'axolotl', kind: 'axolotl', water: 'fresh', rarity: 'legendary', level: 20,
    price: 16000, size: 20, bioload: 4, growTime: 5 * H, sell: 30000, xp: 20, adultXp: 1000,
    temp: [14, 20], minQ: 80, diet: 'carni', temper: 'peaceful', zone: 'bottom', speed: 0.3,
    hunger: 50 * M, beauty: 45, traits: [{ id: 'lucky', v: 0.5 }, { id: 'xpBoost', v: 0.5 }],
    breed: {
      method: 'eggs', needs: ['moss', 'broadleaf'], minHappy: 80, minQ: 85, temp: [15, 19], time: 2 * H,
      hatch: 1 * H, brood: [1, 3], cooldown: 3 * H, mutation: 0.12,
    },
    look: { c1: '#f9c6d0', c2: '#fde2e7', c3: '#e63958' },
    variants: [
      { id: 'golden', name: { tr: 'Altın Albino', en: 'Golden Albino' }, mult: 2, w: 5, look: { c1: '#f6d365', c2: '#fdeaa8', c3: '#f59e0b' } },
      { id: 'melanoid', name: { tr: 'Melanoid', en: 'Melanoid' }, mult: 2, w: 5, look: { c1: '#2b2b33', c2: '#3f3f4a', c3: '#57534e' } },
      { id: 'copper', name: { tr: 'Bakır', en: 'Copper' }, mult: 2.5, w: 3, look: { c1: '#c08457', c2: '#e0b48c', c3: '#b45309', mark: 'dots' } },
      { id: 'gfp', name: { tr: 'Işıltılı (GFP)', en: 'Glowing (GFP)' }, mult: 5, w: 1,
        look: { c1: '#d9f99d', c2: '#ecfccb', c3: '#84cc16', glow: 'rgba(132,204,22,0.6)' } },
    ],
    name: { tr: 'Aksolotl', en: 'Axolotl' }, latin: 'Ambystoma mexicanum',
    fact: {
      tr: 'Aksolotlar kopan uzuvlarını, hatta kalplerinin bir kısmını yeniden oluşturabilir. Soğuk su (14–20°C) ister.',
      en: 'Axolotls can regrow lost limbs and even parts of their heart. They need cold water (14–20°C).',
    },
  },
  {
    id: 'arowana', kind: 'fish', water: 'fresh', rarity: 'legendary', level: 22,
    price: 28000, size: 35, bioload: 10, growTime: 6 * H, sell: 52000, xp: 25, adultXp: 1500,
    temp: [26, 30], minQ: 85, diet: 'carni', temper: 'semi', zone: 'top', speed: 0.5,
    hunger: 60 * M, beauty: 60, minTier: 4, traits: [{ id: 'lucky', v: 1 }, { id: 'xpAura', v: 0.2 }],
    breed: {
      method: 'mouth', needs: [], minHappy: 85, minQ: 90, temp: [27, 30], time: 4 * H, hatch: 2 * H,
      brood: [1, 1], cooldown: 6 * H, mutation: 0.15,
    },
    look: {
      body: 'arowana', h: 0.26, c1: '#c9a227', c2: '#f7e7a6', fin: 'rgba(210,170,60,0.8)',
      tail: 'round', tailSize: 0.42, dorsal: 'long', dorsalSize: 0.35, anal: 'long', analSize: 0.45,
      pelvic: 'small', barbels: true, shine: 1.0, eye: 0.9,
      pattern: [{ type: 'scales', color: 'rgba(255,245,200,0.7)' }],
    },
    variants: [
      { id: 'superRed', name: { tr: 'Süper Kırmızı', en: 'Super Red' }, mult: 2, w: 5,
        look: { c1: '#c1121f', c2: '#f28482', pattern: [{ type: 'scales', color: 'rgba(255,200,200,0.6)' }] } },
      { id: 'crossback', name: { tr: 'Altın Sırt', en: 'Crossback Gold' }, mult: 2.5, w: 3, look: { c1: '#e2b714', c2: '#fff1a8', shine: 1.2 } },
      { id: 'platinum', name: { tr: 'Platin', en: 'Platinum' }, mult: 5, w: 1,
        look: { c1: '#f1f5f9', c2: '#ffffff', glow: 'rgba(220,240,255,0.5)', pattern: [{ type: 'scales', color: 'rgba(255,255,255,0.8)' }] } },
    ],
    name: { tr: 'Ejder Balığı', en: 'Dragon Fish' }, latin: 'Scleropages formosus',
    fact: {
      tr: 'Arowanalar yavrularını ağızlarında taşır; Asya kültüründe bereket ve şans simgesidir.',
      en: 'Arowanas carry their young in their mouths and are symbols of luck in Asian culture.',
    },
  },
  // ----------------------------------------------------------- İNCİ İLE ÖZEL
  {
    id: 'crystalBetta', kind: 'fish', water: 'fresh', rarity: 'epic', level: 3,
    price: 0, pearls: 60, size: 6.5, bioload: 1, growTime: 15 * M, sell: 900, xp: 4, adultXp: 60,
    temp: [24, 30], minQ: 55, diet: 'omni', temper: 'peaceful', zone: 'top', speed: 0.7,
    hunger: 20 * M, beauty: 20, traits: [{ id: 'xpBoost', v: 1.0 }, { id: 'lucky', v: 0.5 }, { id: 'longFin' }],
    look: {
      body: 'betta', h: 0.3, c1: '#e0f2fe', c2: '#bae6fd', fin: 'rgba(186,230,253,0.55)',
      finEdge: 'rgba(125,211,252,0.95)', tail: 'veil', tailSize: 1.4, dorsal: 'long', dorsalSize: 0.85,
      anal: 'long', analSize: 1.0, pelvic: 'long', glow: 'rgba(125,211,252,0.35)', shine: 1,
    },
    name: { tr: 'Kristal Beta', en: 'Crystal Betta' }, latin: 'Betta splendens (özel)',
    fact: {
      tr: 'Özel üretim bu beta, ışıkta kristal gibi parlayan yüzgeçlere sahiptir.',
      en: 'This special-bred betta has fins that sparkle like crystal.',
    },
  },
  {
    id: 'moonAngel', kind: 'fish', water: 'fresh', rarity: 'legendary', level: 8,
    price: 0, pearls: 150, size: 12, bioload: 3, growTime: 40 * M, sell: 4200, xp: 8, adultXp: 250,
    temp: [23, 30], minQ: 60, diet: 'omni', temper: 'peaceful', zone: 'mid', speed: 0.6,
    hunger: 30 * M, beauty: 35, minTier: 1, traits: [{ id: 'xpAura', v: 0.15 }, { id: 'lucky', v: 0.7 }],
    look: {
      body: 'deep', h: 0.75, c1: '#e0e7ff', c2: '#f8fafc', fin: 'rgba(199,210,254,0.55)',
      finEdge: 'rgba(165,180,252,0.9)', tail: 'lyre', tailSize: 0.7, dorsal: 'sail', dorsalSize: 1.4,
      anal: 'tall', analSize: 1.4, pelvic: 'thread', glow: 'rgba(167,139,250,0.45)', shine: 1,
      pattern: [{ type: 'stripesV', color: 'rgba(129,140,248,0.5)', n: 3, w: 0.05 }],
    },
    name: { tr: 'Ay Işığı Meleği', en: 'Moonlight Angel' }, latin: 'Pterophyllum (efsanevi)',
    fact: {
      tr: 'Efsaneye göre Ay Işığı Meleği yalnızca dolunayda ortaya çıkar.',
      en: 'Legend says the Moonlight Angel only appears under a full moon.',
    },
  },
  {
    id: 'goldenBetta', kind: 'fish', water: 'fresh', rarity: 'epic', level: 1, exclusive: 'starter',
    price: 0, size: 6.5, bioload: 1, growTime: 10 * M, sell: 1200, xp: 4, adultXp: 60,
    temp: [22, 30], minQ: 50, diet: 'omni', temper: 'peaceful', zone: 'top', speed: 0.7,
    hunger: 20 * M, beauty: 22, traits: [{ id: 'xpBoost', v: 0.75 }, { id: 'golden', v: 0.5 }, { id: 'longFin' }],
    look: {
      body: 'betta', h: 0.3, c1: '#f5c518', c2: '#d4a017', fin: 'rgba(255,200,40,0.85)',
      finEdge: 'rgba(255,240,170,0.95)', tail: 'veil', tailSize: 1.35, dorsal: 'long', dorsalSize: 0.8,
      anal: 'long', analSize: 0.95, pelvic: 'long', glow: 'rgba(255,215,0,0.3)', shine: 1.2,
    },
    name: { tr: 'Altın Beta', en: 'Golden Betta' }, latin: 'Betta splendens (altın)',
    fact: {
      tr: 'Altın beta, pullarındaki metalik yansımayla nadir bir renk formudur.',
      en: 'The golden betta is a rare color form with metallic scales.',
    },
  },
  // ------------------------------------------------------------------ TUZLU SU
  {
    id: 'clown', kind: 'fish', water: 'marine', rarity: 'uncommon', level: 12,
    price: 600, size: 7, bioload: 1, growTime: 25 * M, sell: 1300, xp: 4, adultXp: 70,
    temp: [24, 28], minQ: 70, diet: 'omni', temper: 'semi', zone: 'mid', speed: 0.9,
    hunger: 20 * M, beauty: 14, traits: [],
    breed: {
      method: 'eggs', needs: ['anemone'], minHappy: 70, minQ: 80, temp: [25, 28], time: 30 * M, hatch: 15 * M,
      brood: [2, 3], cooldown: 40 * M, mutation: 0.1,
    },
    look: {
      body: 'oval', h: 0.45, c1: '#ff7300', c2: '#ff9a3c', fin: 'rgba(255,120,20,0.9)', finEdge: '#111111',
      tail: 'round', tailSize: 0.38, dorsal: 'small', dorsalSize: 0.4, anal: 'small', pelvic: 'small', eye: 1.05,
      pattern: [{ type: 'bands', color: '#ffffff', color2: '#111111', n: 3 }],
    },
    variants: [
      { id: 'snowflake', name: { tr: 'Kar Tanesi', en: 'Snowflake' }, mult: 2.5, w: 5,
        look: { pattern: [{ type: 'bands', color: '#ffffff', color2: '#111111', n: 5 }] } },
      { id: 'black', name: { tr: 'Siyah', en: 'Black Ocellaris' }, mult: 3, w: 3,
        look: { c1: '#1a1a1a', c2: '#2b2b2b', fin: 'rgba(20,20,20,0.9)' } },
      { id: 'platinum', name: { tr: 'Platin', en: 'Platinum' }, mult: 4, w: 1,
        look: { c1: '#fafafa', c2: '#ffffff', fin: 'rgba(255,255,255,0.85)', finEdge: '#ff9f40', pattern: [] } },
    ],
    name: { tr: 'Palyaço Balığı', en: 'Clownfish' }, latin: 'Amphiprion ocellaris',
    fact: {
      tr: 'Palyaço balıkları şakayığın dokunaçlarından etkilenmez ve onunla ortak yaşar.',
      en: 'Clownfish are immune to anemone stings and live in partnership with them.',
    },
  },
  {
    id: 'gramma', kind: 'fish', water: 'marine', rarity: 'uncommon', level: 12,
    price: 700, size: 7, bioload: 1, growTime: 30 * M, sell: 1500, xp: 5, adultXp: 80,
    temp: [24, 27], minQ: 70, diet: 'omni', temper: 'peaceful', zone: 'mid', speed: 0.8,
    hunger: 20 * M, beauty: 14, traits: [{ id: 'fastGrow', v: 0.4 }, { id: 'shy' }],
    look: {
      body: 'oval', h: 0.38, c1: '#7e22ce', c2: '#9333ea', fin: 'rgba(250,204,21,0.85)',
      tail: 'fork', tailSize: 0.38, dorsal: 'long', dorsalSize: 0.3, anal: 'small', eye: 1.05,
      pattern: [{ type: 'rearColor', color: '#facc15', w: 0.5 }, { type: 'dorsalSpot', color: '#111' }],
    },
    name: { tr: 'Kraliyet Gramması', en: 'Royal Gramma' }, latin: 'Gramma loreto',
    fact: {
      tr: 'Kraliyet grammaları mağara ağızlarında baş aşağı yüzmeyi sever.',
      en: 'Royal grammas like to swim upside down near cave openings.',
    },
  },
  {
    id: 'hermit', kind: 'crab', water: 'marine', rarity: 'uncommon', level: 12,
    price: 450, size: 5, bioload: 0.5, growTime: 30 * M, sell: 950, xp: 3, adultXp: 50,
    temp: [22, 28], minQ: 65, diet: 'omni', temper: 'peaceful', zone: 'bottom', speed: 0.3,
    hunger: 40 * M, beauty: 8, traits: [{ id: 'scavenger', v: 1.2 }, { id: 'algaeEater', v: 0.5 }],
    look: { c1: '#b45309', c2: '#f59e0b', c3: '#d6c7a1' },
    name: { tr: 'Keşiş Yengeci', en: 'Hermit Crab' }, latin: 'Clibanarius tricolor',
    fact: {
      tr: 'Keşiş yengeçleri büyüdükçe daha büyük bir kabuğa taşınır.',
      en: 'Hermit crabs move into bigger shells as they grow.',
    },
  },
  {
    id: 'yellowtang', kind: 'fish', water: 'marine', rarity: 'rare', level: 12,
    price: 1500, size: 12, bioload: 3, growTime: 1 * H, sell: 3100, xp: 7, adultXp: 170,
    temp: [24, 28], minQ: 75, diet: 'herbi', temper: 'semi', zone: 'mid', speed: 0.9,
    hunger: 25 * M, beauty: 16, traits: [{ id: 'algaeEater', v: 1.0 }],
    look: {
      body: 'tang', h: 0.78, c1: '#fde047', c2: '#facc15', fin: 'rgba(250,204,21,0.9)',
      tail: 'crescent', tailSize: 0.4, dorsal: 'tall', dorsalSize: 0.45, anal: 'tall', analSize: 0.42, eye: 0.95,
    },
    name: { tr: 'Sarı Cerrah', en: 'Yellow Tang' }, latin: 'Zebrasoma flavescens',
    fact: {
      tr: 'Sarı cerrahlar gün boyu yosun otlayarak resifi temiz tutar.',
      en: 'Yellow tangs graze algae all day and keep reefs clean.',
    },
  },
  {
    id: 'bluetang', kind: 'fish', water: 'marine', rarity: 'rare', level: 13,
    price: 1800, size: 14, bioload: 3, growTime: 70 * M, sell: 3700, xp: 8, adultXp: 200,
    temp: [24, 28], minQ: 75, diet: 'herbi', temper: 'peaceful', zone: 'mid', speed: 0.9,
    hunger: 25 * M, beauty: 20, traits: [{ id: 'algaeEater', v: 0.8 }],
    look: {
      body: 'tang', h: 0.55, c1: '#1d4ed8', c2: '#3b82f6', fin: 'rgba(30,64,175,0.9)', finEdge: '#111111',
      tail: 'crescent', tailSize: 0.42, tailColor: '#facc15', dorsal: 'long', dorsalSize: 0.3, anal: 'long',
      analSize: 0.28, pattern: [{ type: 'palette', color: '#0b1026' }],
    },
    name: { tr: 'Mavi Cerrah', en: 'Blue Tang' }, latin: 'Paracanthurus hepatus',
    fact: {
      tr: 'Mavi cerrahın kuyruğunun yanında neşter gibi keskin bir diken bulunur.',
      en: 'Blue tangs have a scalpel-like spine near their tail.',
    },
  },
  {
    id: 'cleanerShrimp', kind: 'shrimp', water: 'marine', rarity: 'rare', level: 13,
    price: 1100, size: 5, bioload: 0.5, growTime: 40 * M, sell: 2300, xp: 5, adultXp: 90,
    temp: [24, 28], minQ: 75, diet: 'omni', temper: 'peaceful', zone: 'bottom', speed: 0.5,
    hunger: 30 * M, beauty: 12, traits: [{ id: 'healer', v: 1.0 }, { id: 'scavenger', v: 0.5 }],
    look: { c1: '#dc2626', c2: '#fef3c7', c3: '#ffffff', mark: 'stripes' },
    name: { tr: 'Temizlikçi Karides', en: 'Cleaner Shrimp' }, latin: 'Lysmata amboinensis',
    fact: {
      tr: 'Temizlikçi karidesler balıkların üzerindeki parazitleri temizleyerek onları iyileştirir.',
      en: 'Cleaner shrimp heal fish by picking off parasites.',
    },
  },
  {
    id: 'puffer', kind: 'fish', water: 'marine', rarity: 'rare', level: 14,
    price: 1900, size: 12, bioload: 3, growTime: 80 * M, sell: 3900, xp: 8, adultXp: 210,
    temp: [24, 28], minQ: 70, diet: 'carni', temper: 'semi', zone: 'mid', speed: 0.5,
    hunger: 30 * M, beauty: 18, traits: [{ id: 'lucky', v: 0.5 }],
    look: {
      body: 'puffer', h: 0.72, c1: '#dbc98f', c2: '#fffbeb', fin: 'rgba(230,210,150,0.6)',
      tail: 'round', tailSize: 0.3, dorsal: 'small', dorsalSize: 0.25, anal: 'small', eye: 1.35,
      pattern: [{ type: 'spots', color: '#3f3222', n: 18 }],
    },
    name: { tr: 'Kirpi Balığı', en: 'Porcupine Puffer' }, latin: 'Diodon holocanthus',
    fact: {
      tr: 'Kirpi balıkları tehlikede su yutarak top gibi şişer. Dokunarak deneyin!',
      en: 'Porcupine puffers inflate like a ball by gulping water. Try tapping one!',
    },
  },
  {
    id: 'starfish', kind: 'starfish', water: 'marine', rarity: 'rare', level: 15,
    price: 2000, size: 12, bioload: 1, growTime: 80 * M, sell: 4100, xp: 7, adultXp: 180,
    temp: [23, 27], minQ: 80, diet: 'omni', temper: 'peaceful', zone: 'bottom', speed: 0.05,
    hunger: 60 * M, beauty: 22, traits: [{ id: 'scavenger', v: 0.5 }],
    look: { c1: '#2563eb', c2: '#60a5fa', c3: '#1e3a8a', mark: 'dots' },
    name: { tr: 'Mavi Deniz Yıldızı', en: 'Blue Starfish' }, latin: 'Linckia laevigata',
    fact: {
      tr: 'Deniz yıldızları kopan kollarını yeniden büyütebilir.',
      en: 'Starfish can regrow lost arms.',
    },
  },
  {
    id: 'lionfish', kind: 'fish', water: 'marine', rarity: 'rare', level: 16,
    price: 2600, size: 18, bioload: 4, growTime: 90 * M, sell: 5200, xp: 9, adultXp: 260,
    temp: [24, 28], minQ: 70, diet: 'carni', temper: 'aggressive', zone: 'mid', speed: 0.35,
    hunger: 40 * M, beauty: 24, traits: [{ id: 'territorial' }, { id: 'golden', v: 0.3 }],
    look: {
      body: 'lion', h: 0.42, c1: '#b91c1c', c2: '#fde2e2', fin: 'rgba(180,40,40,0.55)',
      tail: 'round', tailSize: 0.4, dorsal: 'spiky', dorsalSize: 0.9, anal: 'small', eye: 0.95,
      pattern: [{ type: 'lionStripes', color: '#fff5f5', n: 10 }],
    },
    name: { tr: 'Aslan Balığı', en: 'Lionfish' }, latin: 'Pterois volitans',
    fact: {
      tr: 'Aslan balığının yelpaze gibi yüzgeçleri zehirli dikenler taşır.',
      en: "The lionfish's fan-like fins carry venomous spines.",
    },
  },
  {
    id: 'moonJelly', kind: 'jelly', water: 'marine', rarity: 'epic', level: 17,
    price: 5000, size: 12, bioload: 2, growTime: 2 * H, sell: 9600, xp: 10, adultXp: 350,
    temp: [18, 25], minQ: 80, diet: 'carni', temper: 'peaceful', zone: 'any', speed: 0.2,
    hunger: 40 * M, beauty: 40, traits: [{ id: 'xpBoost', v: 0.3 }],
    look: { c1: 'rgba(200,220,255,0.35)', c2: 'rgba(230,240,255,0.55)', c3: 'rgba(210,160,255,0.75)', glow: 'rgba(160,200,255,0.4)' },
    name: { tr: 'Ay Denizanası', en: 'Moon Jellyfish' }, latin: 'Aurelia aurita',
    fact: {
      tr: 'Ay denizanalarının beyni ve kalbi yoktur; vücutlarının %95’i sudur.',
      en: 'Moon jellies have no brain or heart and are about 95% water.',
    },
  },
  {
    id: 'seahorse', kind: 'seahorse', water: 'marine', rarity: 'epic', level: 18,
    price: 5200, size: 12, bioload: 1, growTime: 2 * H, sell: 10000, xp: 11, adultXp: 400,
    temp: [22, 26], minQ: 80, diet: 'carni', temper: 'peaceful', zone: 'mid', speed: 0.2,
    hunger: 35 * M, beauty: 32, traits: [{ id: 'shy' }],
    breed: {
      method: 'live', needs: ['holdfast'], minHappy: 80, minQ: 88, temp: [23, 26], time: 90 * M, hatch: 0,
      brood: [2, 4], cooldown: 2 * H, mutation: 0.08,
    },
    look: { c1: '#f59e0b', c2: '#fcd34d', c3: '#b45309', mark: 'dots' },
    variants: [
      { id: 'yellow', name: { tr: 'Sarı', en: 'Yellow' }, mult: 2, w: 6, look: { c1: '#facc15', c2: '#fef08a' } },
      { id: 'red', name: { tr: 'Kırmızı', en: 'Red' }, mult: 3, w: 3, look: { c1: '#dc2626', c2: '#f87171' } },
      { id: 'zebra', name: { tr: 'Zebra', en: 'Zebra' }, mult: 4, w: 1, look: { c1: '#f5f5f4', c2: '#e7e5e4', mark: 'zebra' } },
    ],
    name: { tr: 'Denizatı', en: 'Seahorse' }, latin: 'Hippocampus kuda',
    fact: {
      tr: 'Denizatlarında yavruları erkek taşır ve doğurur!',
      en: 'In seahorses, the males carry and give birth to the young!',
    },
  },
  {
    id: 'mandarin', kind: 'fish', water: 'marine', rarity: 'epic', level: 19,
    price: 7000, size: 7, bioload: 1, growTime: 2.5 * H, sell: 13500, xp: 12, adultXp: 450,
    temp: [24, 27], minQ: 85, diet: 'carni', temper: 'peaceful', zone: 'bottom', speed: 0.35,
    hunger: 40 * M, beauty: 40, needsDecor: 'liverock', traits: [{ id: 'xpBoost', v: 0.5 }, { id: 'shy' }],
    look: {
      body: 'mandarin', h: 0.42, c1: '#1d4ed8', c2: '#2563eb', fin: 'rgba(234,88,12,0.85)',
      finEdge: 'rgba(56,189,248,0.9)', tail: 'round', tailSize: 0.4, dorsal: 'sail', dorsalSize: 0.7,
      anal: 'long', analSize: 0.4, pelvic: 'small', eye: 1.1, eyeColor: '#f97316',
      pattern: [{ type: 'waves', color: '#f97316', n: 7, w: 0.05 }, { type: 'dots', color: '#22d3ee', n: 12 }],
    },
    name: { tr: 'Mandarin Balığı', en: 'Mandarin Dragonet' }, latin: 'Synchiropus splendidus',
    fact: {
      tr: 'Mandarin balığı canlı kayalardaki minik kopepodlarla beslenir; bu yüzden canlı kaya ister.',
      en: 'Mandarins feed on tiny copepods living on live rock, so they need live rock.',
    },
  },
  {
    id: 'emperor', kind: 'fish', water: 'marine', rarity: 'epic', level: 21,
    price: 9500, size: 20, bioload: 5, growTime: 3 * H, sell: 18000, xp: 14, adultXp: 550,
    temp: [24, 27], minQ: 80, diet: 'omni', temper: 'semi', zone: 'mid', speed: 0.6,
    hunger: 40 * M, beauty: 38, minTier: 1, traits: [{ id: 'xpAura', v: 0.12 }],
    look: {
      body: 'deep', h: 0.68, c1: '#1e3a8a', c2: '#1d4ed8', fin: 'rgba(30,58,138,0.9)',
      finEdge: 'rgba(96,165,250,0.9)', tail: 'round', tailSize: 0.4, tailColor: '#facc15', dorsal: 'long',
      dorsalSize: 0.4, anal: 'long', analSize: 0.4, eye: 0.95,
      pattern: [{ type: 'stripesH', color: '#fde047', n: 11, w: 0.03 }, { type: 'mask', color: '#0b1026' }],
    },
    name: { tr: 'İmparator Melek', en: 'Emperor Angelfish' }, latin: 'Pomacanthus imperator',
    fact: {
      tr: 'İmparator melek yavruları yetişkinlerden tamamen farklı mavi-beyaz halkalarla doğar.',
      en: 'Juvenile emperor angelfish have blue-white rings, totally unlike the adults.',
    },
  },
  {
    id: 'seadragon', kind: 'seahorse', water: 'marine', rarity: 'legendary', level: 28,
    price: 45000, size: 24, bioload: 4, growTime: 7 * H, sell: 82000, xp: 30, adultXp: 2200,
    temp: [16, 22], minQ: 88, diet: 'carni', temper: 'peaceful', zone: 'mid', speed: 0.15,
    hunger: 60 * M, beauty: 90, traits: [{ id: 'xpAura', v: 0.25 }, { id: 'lucky', v: 1 }, { id: 'shy' }],
    look: { c1: '#ca8a04', c2: '#fde68a', c3: '#65a30d', mark: 'leafy' },
    name: { tr: 'Yapraklı Deniz Ejderi', en: 'Leafy Seadragon' }, latin: 'Phycodurus eques',
    fact: {
      tr: 'Yaprak benzeri uzantıları onu yosunlar arasında görünmez kılar. Serin su (16–22°C) ister.',
      en: 'Its leaf-like appendages make it vanish among seaweed. It needs cool water (16–22°C).',
    },
  },
];

export const SPECIES_BY_ID: Record<string, SpeciesDef> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export function getSpecies(id: string): SpeciesDef {
  const s = SPECIES_BY_ID[id];
  if (!s) throw new Error(`Bilinmeyen tür: ${id}`);
  return s;
}
