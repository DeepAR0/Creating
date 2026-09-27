import { BAL } from './balance';
import type { FishState, GameState, Lang, Sex, StatKey, TankState, WaterType } from './types';
import { getSpecies } from '../data/species';
import { getTier } from '../data/tanks';
import { dayKey, pick, uid } from './util';

export const SAVE_VERSION = 1;

const STAT_KEYS: StatKey[] = [
  'fed', 'sold', 'grown', 'bred', 'mutations', 'wiped', 'vacuumed', 'waterChanges', 'coinsEarned',
  'bought', 'decorPlaced', 'lucky', 'trimmed', 'tipsCollected', 'questsDone', 'adsWatched', 'eggsOpened',
];

const NAMES: Record<Lang, string[]> = {
  tr: [
    'Boncuk', 'Pamuk', 'Minnoş', 'Fındık', 'Karamel', 'Zeytin', 'Limon', 'Tarçın', 'Şeker', 'Maviş',
    'Yıldız', 'Bulut', 'Dalga', 'Mercan', 'İnci', 'Kuki', 'Pofuduk', 'Çiko', 'Kiraz', 'Nane',
    'Leblebi', 'Lokum', 'Susam', 'Paşa', 'Sultan', 'Şimşek', 'Köpük', 'Balon', 'Gofret', 'Pırıl',
    'Işıltı', 'Nazlı', 'Tospik', 'Şans', 'Alev', 'Kehribar', 'Safir', 'Zümrüt', 'Yakut', 'Poyraz',
    'Deniz', 'Ada', 'Ege', 'Rüzgar', 'Mavi', 'Pırpır', 'Fıstık', 'Badem', 'Kestane', 'Papatya',
  ],
  en: [
    'Bubbles', 'Finn', 'Coral', 'Pearl', 'Sunny', 'Mango', 'Pebble', 'Splash', 'Ziggy', 'Luna',
    'Nova', 'Skipper', 'Goldie', 'Biscuit', 'Peanut', 'Marble', 'Pixel', 'Comet', 'Ripple', 'Wave',
    'Maple', 'Olive', 'Pepper', 'Cookie', 'Noodle', 'Blue', 'Sparky', 'Minnow', 'Shelly', 'Tango',
    'Kiwi', 'Cleo', 'Otto', 'Ruby', 'Sapphire', 'Jade', 'Echo', 'Misty', 'Dotty', 'Squirt',
  ],
};

export function randomName(lang: Lang): string {
  return pick(NAMES[lang]);
}

export function createTank(state: { nextId: number }, type: WaterType): TankState {
  const fresh = type === 'fresh';
  return {
    id: uid(state, 't'),
    type,
    tier: 0,
    fish: [],
    plants: [],
    decor: [],
    equip: fresh ? { filter: 1, light: 1 } : { filter: 1, light: 1, heater: 1 },
    targetTemp: fresh ? BAL.ROOM_TEMP : 25,
    temp: fresh ? BAL.ROOM_TEMP : 25,
    pollution: 5,
    dirt: 2,
    oxygen: 75,
    algae: new Array(BAL.ALGAE_COLS * BAL.ALGAE_ROWS).fill(0),
    light: true,
    clutches: [],
    tips: 0,
    background: fresh ? 'deepBlue' : 'reef',
    substrate: fresh ? 'sand' : 'coralSand',
    feederT: 0,
  };
}

export function createFish(
  state: { nextId: number },
  sp: string,
  lang: Lang,
  opts: { sex?: Sex; g?: number; variant?: string; bred?: boolean } = {},
): FishState {
  const def = getSpecies(sp);
  return {
    id: uid(state, 'f'),
    sp,
    name: randomName(lang),
    sex: opts.sex ?? (Math.random() < 0.5 ? 'M' : 'F'),
    g: opts.g ?? BAL.BABY_START_G,
    food: 70,
    hp: 100,
    joy: 70,
    var: opts.variant,
    bred: opts.bred,
    born: Date.now(),
    luck: def.traits.some((t) => t.id === 'lucky') ? BAL.LUCKY_INTERVAL * (0.5 + Math.random()) : undefined,
  };
}

export function createInitialState(lang: Lang): GameState {
  const base: GameState = {
    v: SAVE_VERSION,
    seed: Math.floor(Math.random() * 1e9),
    createdAt: Date.now(),
    lastSeen: Date.now(),
    playTime: 0,
    player: { level: 1, xp: 0, coins: BAL.START_COINS, pearls: BAL.START_PEARLS },
    tanks: [],
    active: 0,
    inv: { food: { ...BAL.START_FOOD }, items: {}, decor: {}, plants: {} },
    owned: { deepBlue: true, sand: true, reef: true, coralSand: true },
    selectedFood: 'flakes',
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>,
    discovered: {},
    achievements: {},
    daily: {
      day: '',
      quests: [],
      bonusClaimed: false,
      rerolls: 0,
      ads: {},
      hot: [],
      loginStreak: 0,
      loginClaimed: false,
      lastLoginDay: '',
      vipClaimed: false,
    },
    settings: { music: true, sfx: true, haptics: true, notifications: false, lang: 'auto', quality: 'high' },
    iap: { removeAds: false, vipUntil: 0, starter: false, starterGranted: false, granted: [] },
    tutorial: { step: 0, done: false },
    flags: {},
    tipCapBonus: 0,
    nextId: 1,
  };
  const tank = createTank(base, 'fresh');
  // Başlangıç: iki yavru japon balığı, bir bitki ve bir kaya
  const a = createFish(base, 'goldfish', lang, { sex: 'M', g: 0.15 });
  const b = createFish(base, 'goldfish', lang, { sex: 'F', g: 0.1 });
  a.food = 45;
  b.food = 40;
  tank.fish.push(a, b);
  tank.plants.push({ id: uid(base, 'p'), def: 'javaFern', x: 9, z: 0.2, g: 0.6 });
  tank.decor.push({ id: uid(base, 'd'), def: 'rockpile', x: 30, z: 0.45 });
  // Öğretici için camda biraz yosun
  for (let i = 0; i < tank.algae.length; i++) {
    const c = i % BAL.ALGAE_COLS;
    const r = Math.floor(i / BAL.ALGAE_COLS);
    if (c > 15 && c < 21 && r > 2 && r < 7) tank.algae[i] = 0.35 + Math.random() * 0.3;
  }
  base.tanks.push(tank);
  base.discovered.goldfish = Date.now();
  base.daily.day = '';
  base.daily.lastLoginDay = dayKey();
  return base;
}

/** Eski/eksik kayıtları güncel şemaya tamamlar */
export function migrate(raw: unknown, lang: Lang): GameState {
  const def = createInitialState(lang);
  if (!raw || typeof raw !== 'object') return def;
  const s = raw as Partial<GameState>;
  const out: GameState = {
    ...def,
    ...s,
    player: { ...def.player, ...(s.player ?? {}) },
    inv: {
      food: { ...(s.inv?.food ?? def.inv.food) },
      items: { ...(s.inv?.items ?? {}) },
      decor: { ...(s.inv?.decor ?? {}) },
      plants: { ...(s.inv?.plants ?? {}) },
    },
    owned: { ...def.owned, ...(s.owned ?? {}) },
    stats: { ...def.stats, ...(s.stats ?? {}) },
    discovered: { ...(s.discovered ?? def.discovered) },
    achievements: { ...(s.achievements ?? {}) },
    daily: { ...def.daily, ...(s.daily ?? {}) },
    settings: { ...def.settings, ...(s.settings ?? {}) },
    iap: { ...def.iap, ...(s.iap ?? {}) },
    tutorial: { ...def.tutorial, ...(s.tutorial ?? {}) },
    flags: { ...(s.flags ?? {}) },
    tanks: Array.isArray(s.tanks) && s.tanks.length ? s.tanks : def.tanks,
  };
  for (const t of out.tanks) {
    const blank = createTank({ nextId: 0 }, t.type ?? 'fresh');
    t.fish ??= [];
    t.plants ??= [];
    t.decor ??= [];
    t.clutches ??= [];
    t.equip ??= blank.equip;
    if (!Array.isArray(t.algae) || t.algae.length !== BAL.ALGAE_COLS * BAL.ALGAE_ROWS) t.algae = blank.algae;
    t.background ??= blank.background;
    t.substrate ??= blank.substrate;
    t.feederT ??= 0;
    t.tips ??= 0;
    // Artık var olmayan türleri temizle
    t.fish = t.fish.filter((f) => {
      try {
        getSpecies(f.sp);
        return true;
      } catch {
        return false;
      }
    });
  }
  out.active = Math.min(Math.max(0, out.active | 0), out.tanks.length - 1);
  out.v = SAVE_VERSION;
  return out;
}

// ---------------------------------------------------------------------------
// Sorgu yardımcıları
// ---------------------------------------------------------------------------

export function activeTank(s: GameState): TankState {
  return s.tanks[s.active] ?? s.tanks[0];
}

export function tierDef(t: TankState) {
  return getTier(t.type, t.tier);
}

export function capacityUsed(t: TankState): number {
  return t.fish.reduce((sum, f) => sum + getSpecies(f.sp).bioload, 0);
}

export function capacityFree(t: TankState): number {
  return tierDef(t).cap - capacityUsed(t);
}

export function stockRatio(t: TankState): number {
  const cap = tierDef(t).cap;
  const used = t.fish.reduce((sum, f) => sum + getSpecies(f.sp).bioload * (0.4 + 0.6 * f.g), 0);
  return used / cap;
}

export function findFish(s: GameState, id: string): { tank: TankState; fish: FishState } | null {
  for (const tank of s.tanks) {
    const fish = tank.fish.find((f) => f.id === id);
    if (fish) return { tank, fish };
  }
  return null;
}

export function isVip(s: GameState, now = Date.now()): boolean {
  return s.iap.vipUntil > now;
}

export function adsRemoved(s: GameState): boolean {
  return s.iap.removeAds || isVip(s);
}

export function tankById(s: GameState, id: string): TankState | undefined {
  return s.tanks.find((t) => t.id === id);
}
