import type { FoodDef, ItemDef } from '../game/types';

// Yemler: her dokunuş 1 tutam kullanır; tutam birkaç partikül olarak suya düşer.
export const FOODS: FoodDef[] = [
  {
    id: 'flakes', level: 1, price: 20, pack: 40, water: 'both', particles: 3, nutrition: 9, xpMult: 1,
    boost: 0, boostTime: 0, sink: 1.6, diet: { omni: 1, herbi: 1, carni: 0.7 }, color: '#e8a33a', shape: 'flake',
    name: { tr: 'Pul Yem', en: 'Flakes' }, desc: { tr: 'Her balık için temel günlük yem. Yavaş batar.', en: 'Basic daily food for every fish. Sinks slowly.' },
  },
  {
    id: 'pellets', level: 3, price: 45, pack: 40, water: 'both', particles: 3, nutrition: 11, xpMult: 1.25,
    boost: 0.1, boostTime: 60, sink: 5, diet: { omni: 1.1, herbi: 0.9, carni: 1 }, color: '#8d5a2b', shape: 'pellet',
    name: { tr: 'Granül Yem', en: 'Pellets' }, desc: { tr: 'Hızlı batar, dipte beslenenler için ideal. +%25 GP.', en: 'Sinks fast, great for bottom feeders. +25% XP.' },
  },
  {
    id: 'spirulina', level: 5, price: 60, pack: 30, water: 'both', particles: 1, nutrition: 30, xpMult: 1.2,
    boost: 0.1, boostTime: 90, sink: 6, diet: { omni: 0.9, herbi: 1.4, carni: 0.5 }, color: '#2e7d32', shape: 'tablet',
    name: { tr: 'Spirulina Tablet', en: 'Spirulina Wafer' }, desc: { tr: 'Otçullar, salyangoz ve karidesler için yosun tableti.', en: 'Algae wafer for herbivores, snails and shrimp.' },
  },
  {
    id: 'bloodworm', level: 8, price: 120, pack: 25, water: 'both', particles: 3, nutrition: 12, xpMult: 1.7,
    boost: 0.4, boostTime: 180, sink: 2.5, diet: { omni: 1.1, herbi: 0.6, carni: 1.4 }, color: '#b71c1c', shape: 'worm',
    name: { tr: 'Kan Kurdu', en: 'Bloodworms' }, desc: { tr: 'Etçillerin favorisi. 3 dk boyunca +%40 büyüme, +%70 GP.', en: 'Carnivores love it. +40% growth for 3 min, +70% XP.' },
  },
  {
    id: 'mysis', level: 12, price: 300, pack: 25, water: 'both', particles: 3, nutrition: 14, xpMult: 2,
    boost: 0.5, boostTime: 240, sink: 2, diet: { omni: 1.1, herbi: 0.6, carni: 1.5 }, color: '#f4b6c8', shape: 'shrimp',
    name: { tr: 'Mysis Karidesi', en: 'Mysis Shrimp' }, desc: { tr: 'Deniz canlıları için protein deposu. 4 dk +%50 büyüme, 2× GP.', en: 'Protein-packed for marine life. +50% growth for 4 min, 2× XP.' },
  },
  {
    id: 'golden', level: 1, price: 0, pearls: 10, pack: 15, water: 'both', particles: 3, nutrition: 15, xpMult: 3,
    boost: 1, boostTime: 300, sink: 1.8, diet: { omni: 1.2, herbi: 1.2, carni: 1.2 }, color: '#ffd54f', shape: 'flake',
    name: { tr: 'Altın Mama', en: 'Golden Feed' }, desc: { tr: 'Premium karışım: 5 dk 2× büyüme ve 3× GP!', en: 'Premium blend: 2× growth for 5 min and 3× XP!' },
  },
];

export const FOODS_BY_ID: Record<string, FoodDef> = Object.fromEntries(FOODS.map((f) => [f.id, f]));

export function getFood(id: string): FoodDef {
  return FOODS_BY_ID[id] ?? FOODS[0];
}

export const ITEMS: ItemDef[] = [
  {
    id: 'medicine', level: 3, price: 120,
    name: { tr: 'Geniş Spektrum İlaç', en: 'Broad-Spectrum Medicine' },
    desc: { tr: 'Tanktaki tüm hasta canlıları iyileştirir ve sağlık verir.', en: 'Cures every sick animal in the tank and restores health.' },
  },
  {
    id: 'elixir', level: 2, pearls: 5,
    name: { tr: 'Büyüme İksiri', en: 'Growth Elixir' },
    desc: { tr: 'Seçilen canlıyı anında %35 büyütür.', en: 'Instantly grows the chosen animal by 35%.' },
  },
  {
    id: 'mysteryEgg', level: 3, pearls: 30,
    name: { tr: 'Sürpriz Yumurta', en: 'Mystery Egg' },
    desc: { tr: 'Rastgele bir canlı çıkar. Olasılıklar açıkça gösterilir.', en: 'Hatches a random animal. Odds are shown openly.' },
  },
];

export function getItem(id: string): ItemDef {
  const i = ITEMS.find((x) => x.id === id);
  if (!i) throw new Error(`Bilinmeyen eşya: ${id}`);
  return i;
}

/** Sürpriz Yumurta nadirlik olasılıkları (Apple kuralı gereği oyuncuya gösterilir) */
export const EGG_ODDS: Record<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary', number> = {
  common: 0.5,
  uncommon: 0.3,
  rare: 0.15,
  epic: 0.045,
  legendary: 0.005,
};
