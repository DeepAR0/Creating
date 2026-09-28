import type { DecorDef } from '../game/types';

// Dekorlar güzellik (ziyaretçi geliri + mutluluk), saklanma yeri ve üreme yuvası sağlar.
export const DECOR: DecorDef[] = [
  {
    id: 'pebbles', water: 'both', rarity: 'common', level: 1, price: 30, art: 'pebbles', w: 13, h: 4, beauty: 2,
    name: { tr: 'Dere Çakılları', en: 'River Pebbles' }, desc: { tr: 'Doğal görünüm için yuvarlak çakıllar.', en: 'Smooth pebbles for a natural look.' },
  },
  {
    id: 'rockpile', water: 'both', rarity: 'common', level: 1, price: 70, art: 'rockpile', w: 14, h: 10, beauty: 4, hide: true,
    name: { tr: 'Kaya Yığını', en: 'Rock Pile' }, desc: { tr: 'Çekingen balıklar için saklanma alanı.', en: 'A hiding spot for shy fish.' },
  },
  {
    id: 'shells', water: 'both', rarity: 'common', level: 2, price: 60, art: 'shells', w: 11, h: 4, beauty: 3,
    name: { tr: 'Deniz Kabukları', en: 'Seashells' }, desc: { tr: 'Kumda parıldayan renkli kabuklar.', en: 'Colorful shells glinting in the sand.' },
  },
  {
    id: 'driftwood', water: 'both', rarity: 'uncommon', level: 3, price: 220, art: 'driftwood', w: 26, h: 14, beauty: 7, hide: true,
    name: { tr: 'Kök Dal', en: 'Driftwood' }, desc: { tr: 'Doğal saklanma alanı; vantuz balıkları bayılır.', en: 'A natural hideout that plecos love.' },
  },
  {
    id: 'cave', water: 'both', rarity: 'uncommon', level: 4, price: 320, art: 'cave', w: 16, h: 12, beauty: 7, hide: true, sites: ['cave'],
    name: { tr: 'Taş Mağara', en: 'Stone Cave' }, desc: { tr: 'Mağarada yumurtlayan çiklitler için yuva.', en: 'A nest for cave-spawning cichlids.' },
  },
  {
    id: 'chest', water: 'both', rarity: 'uncommon', level: 5, price: 650, art: 'chest', w: 12, h: 9, beauty: 12, o2: 3,
    name: { tr: 'Hazine Sandığı', en: 'Treasure Chest' }, desc: { tr: 'Arada bir açılıp hava kabarcığı saçar.', en: 'Opens now and then to release bubbles.' },
  },
  {
    id: 'slate', water: 'both', rarity: 'uncommon', level: 6, price: 260, art: 'slate', w: 14, h: 8, beauty: 5, sites: ['flat'],
    name: { tr: 'Yassı Arduvaz', en: 'Flat Slate' }, desc: { tr: 'Diskus ve ramirezi yumurtlamak için düz taş arar.', en: 'Discus and rams look for flat stones to spawn on.' },
  },
  {
    id: 'diver', water: 'both', rarity: 'uncommon', level: 6, price: 780, art: 'diver', w: 7, h: 14, beauty: 11, o2: 3,
    name: { tr: 'Dalgıç', en: 'Deep Sea Diver' }, desc: { tr: 'Kaskından kabarcıklar yükselen klasik dalgıç.', en: 'A classic diver with bubbles rising from his helmet.' },
  },
  {
    id: 'amphora', water: 'both', rarity: 'uncommon', level: 7, price: 900, art: 'amphora', w: 12, h: 10, beauty: 10, hide: true, sites: ['cave'],
    name: { tr: 'Antik Amfora', en: 'Ancient Amphora' }, desc: { tr: 'Batık bir gemiden kalma testi; içi harika bir yuva.', en: 'A jar from an old wreck; a perfect nest inside.' },
  },
  {
    id: 'anchor', water: 'both', rarity: 'uncommon', level: 7, price: 700, art: 'anchor', w: 10, h: 16, beauty: 9,
    name: { tr: 'Batık Çapa', en: 'Sunken Anchor' }, desc: { tr: 'Paslı zinciriyle eski bir gemi çapası.', en: 'An old ship anchor with a rusty chain.' },
  },
  {
    id: 'castle', water: 'both', rarity: 'rare', level: 8, price: 1300, art: 'castle', w: 18, h: 22, beauty: 16, hide: true, sites: ['cave'],
    name: { tr: 'Su Altı Kalesi', en: 'Underwater Castle' }, desc: { tr: 'Kuleleri ve kapısıyla masalsı bir kale.', en: 'A fairy-tale castle with towers and a gate.' },
  },
  {
    id: 'ship', water: 'both', rarity: 'rare', level: 9, price: 1800, art: 'ship', w: 32, h: 16, beauty: 20, hide: true,
    name: { tr: 'Batık Gemi', en: 'Shipwreck' }, desc: { tr: 'Balıkların keşfetmeye bayıldığı eski bir gemi enkazı.', en: 'An old wreck fish love to explore.' },
  },
  {
    id: 'volcano', water: 'both', rarity: 'rare', level: 10, price: 2200, art: 'volcano', w: 15, h: 12, beauty: 16, o2: 8,
    name: { tr: 'Yanardağ Hava Taşı', en: 'Volcano Bubbler' }, desc: { tr: 'Kabarcık püskürterek oksijeni artırır.', en: 'Erupts bubbles and boosts oxygen.' },
  },
  {
    id: 'clam', water: 'both', rarity: 'legendary', level: 10, price: 0, pearls: 80, art: 'clam', w: 14, h: 9, beauty: 40, pearlGen: 8 * 3600,
    name: { tr: 'Dev İstiridye', en: 'Giant Clam' }, desc: { tr: 'Her 8 saatte bir gerçek bir inci üretir!', en: 'Produces a real pearl every 8 hours!' },
  },
  {
    id: 'bridge', water: 'both', rarity: 'rare', level: 11, price: 2600, art: 'bridge', w: 26, h: 12, beauty: 18, hide: true,
    name: { tr: 'Taş Köprü', en: 'Stone Bridge' }, desc: { tr: 'Balıkların altından geçmeyi sevdiği kemerli köprü.', en: 'An arched bridge fish love to swim under.' },
  },
  {
    id: 'columns', water: 'both', rarity: 'rare', level: 12, price: 3200, art: 'columns', w: 20, h: 22, beauty: 22,
    name: { tr: 'Antik Sütunlar', en: 'Ancient Columns' }, desc: { tr: 'Batık bir tapınaktan kalan mermer sütunlar.', en: 'Marble columns from a sunken temple.' },
  },
  {
    id: 'temple', water: 'both', rarity: 'legendary', level: 12, price: 0, pearls: 150, art: 'temple', w: 26, h: 22, beauty: 70, aura: 0.05,
    name: { tr: 'Atlantis Tapınağı', en: 'Atlantis Temple' }, desc: { tr: 'Efsanevi tapınak: tanka +%5 GP aurası verir.', en: 'Legendary temple: gives the tank a +5% XP aura.' },
  },
  {
    id: 'head', water: 'both', rarity: 'epic', level: 14, price: 4800, art: 'head', w: 12, h: 20, beauty: 28,
    name: { tr: 'Taş Dev Heykeli', en: 'Stone Giant Statue' }, desc: { tr: 'Gizemli bir adadan gelen dev taş yüz.', en: 'A giant stone face from a mysterious island.' },
  },
  {
    id: 'dragon', water: 'both', rarity: 'legendary', level: 15, price: 0, pearls: 250, art: 'dragon', w: 22, h: 18, beauty: 90, aura: 0.1,
    name: { tr: 'Altın Ejder Heykeli', en: 'Golden Dragon Statue' }, desc: { tr: 'Şans getiren ejder: tanka +%10 GP aurası verir.', en: 'A lucky dragon: gives the tank a +10% XP aura.' },
  },
  {
    id: 'crystal', water: 'both', rarity: 'epic', level: 16, price: 6500, art: 'crystal', w: 12, h: 14, beauty: 32, glow: '#a78bfa',
    name: { tr: 'Kristal Küme', en: 'Crystal Cluster' }, desc: { tr: 'Işıklar kapandığında büyüleyici biçimde parlar.', en: 'Glows beautifully when the lights go out.' },
  },
  {
    id: 'lighthouse', water: 'both', rarity: 'epic', level: 18, price: 8200, art: 'lighthouse', w: 10, h: 26, beauty: 36,
    name: { tr: 'Batık Deniz Feneri', en: 'Sunken Lighthouse' }, desc: { tr: 'Işığı hâlâ dönen gizemli bir fener.', en: 'A mysterious lighthouse whose lamp still turns.' },
  },
  {
    id: 'palace', water: 'both', rarity: 'legendary', level: 1, price: 0, exclusive: 'vip', art: 'palace', w: 24, h: 24, beauty: 80, aura: 0.05, glow: '#67e8f9',
    name: { tr: 'Kristal Saray (VIP)', en: 'Crystal Palace (VIP)' }, desc: { tr: 'Yalnızca VIP Kulüp üyelerine özel. +%5 GP aurası.', en: 'Exclusive to VIP Club members. +5% XP aura.' },
  },
  {
    id: 'liverock', water: 'marine', rarity: 'common', level: 12, price: 500, art: 'liverock', w: 16, h: 12, beauty: 6, hide: true,
    name: { tr: 'Canlı Kaya', en: 'Live Rock' }, desc: { tr: 'Faydalı mikro canlılarla dolu kaya; mandarin balığı için şart.', en: 'Rock full of helpful micro-life; required for mandarins.' },
  },
  {
    id: 'arch', water: 'marine', rarity: 'rare', level: 14, price: 2400, art: 'arch', w: 28, h: 18, beauty: 18, hide: true, sites: ['cave'],
    name: { tr: 'Resif Kemeri', en: 'Reef Arch' }, desc: { tr: 'Mercanlarla kaplı doğal bir kaya kemeri.', en: 'A natural rock arch covered in coral.' },
  },

  // ---------------------------------------------------------------- sezon etkinlikleri
  {
    id: 'flowerPot', water: 'fresh', rarity: 'rare', level: 1, price: 900, season: 'spring', art: 'flowerPot', w: 10, h: 12, beauty: 16,
    name: { tr: 'Lale Saksısı', en: 'Tulip Pot' }, desc: { tr: 'Bahar Şenliği’ne özel: rengârenk laleler.', en: 'Spring Festival only: a pot of bright tulips.' },
  },
  {
    id: 'pagoda', water: 'fresh', rarity: 'legendary', level: 1, price: 0, exclusive: 'season', art: 'pagoda', w: 16, h: 22, beauty: 45, hide: true, sites: ['cave'], aura: 0.03,
    name: { tr: 'Sakura Pagodası', en: 'Sakura Pagoda' }, desc: { tr: 'Bahar Şenliği ödülü. +%3 GP aurası.', en: 'Spring Festival reward. +3% XP aura.' },
  },
  {
    id: 'sandcastle', water: 'both', rarity: 'rare', level: 1, price: 1100, season: 'summer', art: 'sandcastle', w: 16, h: 13, beauty: 16, hide: true,
    name: { tr: 'Kumdan Kale', en: 'Sandcastle' }, desc: { tr: 'Yaz Festivali’ne özel: kulesinde bayrak dalgalanır.', en: 'Summer Festival only: a flag waves on top.' },
  },
  {
    id: 'tiki', water: 'both', rarity: 'legendary', level: 1, price: 0, exclusive: 'season', art: 'tiki', w: 9, h: 18, beauty: 45, aura: 0.03, glow: '#fb923c',
    name: { tr: 'Tiki Totemi', en: 'Tiki Totem' }, desc: { tr: 'Yaz Festivali ödülü. Meşaleleri geceleri parlar. +%3 GP aurası.', en: 'Summer Festival reward. Its torches glow at night. +3% XP aura.' },
  },
  {
    id: 'pumpkin', water: 'both', rarity: 'rare', level: 1, price: 1000, season: 'halloween', art: 'pumpkin', w: 10, h: 8, beauty: 15, glow: '#fb923c',
    name: { tr: 'Balkabağı Feneri', en: 'Jack-o’-Lantern' }, desc: { tr: 'Cadılar Festivali’ne özel: içinde mum titrer.', en: 'Spooky Festival only: a candle flickers inside.' },
  },
  {
    id: 'cauldron', water: 'both', rarity: 'legendary', level: 1, price: 0, exclusive: 'season', art: 'cauldron', w: 12, h: 11, beauty: 45, o2: 5, aura: 0.03, glow: '#84cc16',
    name: { tr: 'Cadı Kazanı', en: 'Witch’s Cauldron' }, desc: { tr: 'Cadılar Festivali ödülü. Fokurdayarak oksijen verir. +%3 GP aurası.', en: 'Spooky Festival reward. Bubbles add oxygen. +3% XP aura.' },
  },
  {
    id: 'snowman', water: 'both', rarity: 'rare', level: 1, price: 1200, season: 'winter', art: 'snowman', w: 9, h: 15, beauty: 17,
    name: { tr: 'Kardan Adam', en: 'Snowman' }, desc: { tr: 'Kış Festivali’ne özel: atkısı ve şapkasıyla.', en: 'Winter Festival only: with a scarf and top hat.' },
  },
  {
    id: 'giftTree', water: 'both', rarity: 'legendary', level: 1, price: 0, exclusive: 'season', art: 'giftTree', w: 13, h: 22, beauty: 50, aura: 0.03, glow: '#fde047',
    name: { tr: 'Yılbaşı Ağacı', en: 'Holiday Tree' }, desc: { tr: 'Kış Festivali ödülü. Işıkları yanıp söner. +%3 GP aurası.', en: 'Winter Festival reward. Its lights twinkle. +3% XP aura.' },
  },
];

export const DECOR_BY_ID: Record<string, DecorDef> = Object.fromEntries(DECOR.map((d) => [d.id, d]));

export function getDecor(id: string): DecorDef {
  const d = DECOR_BY_ID[id];
  if (!d) throw new Error(`Bilinmeyen dekor: ${id}`);
  return d;
}
