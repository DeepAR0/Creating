import type { PlantDef } from '../game/types';

const M = 60;

// Bitkiler ve mercanlar büyür, oksijen üretir, suyu temizler ve olgunlaşınca budanıp satılabilir.
export const PLANTS: PlantDef[] = [
  // ------------------------------------------------------------ TATLI SU
  {
    id: 'javaFern', water: 'fresh', rarity: 'common', level: 1, price: 40, type: 'fern', light: 1,
    growTime: 15 * M, beauty: 4, o2: 3, clean: 0.5, trim: 25, sites: [], hide: true, w: 9, h: 14,
    c1: '#2f7d32', c2: '#5cb860',
    name: { tr: 'Java Eğreltisi', en: 'Java Fern' },
    fact: { tr: 'Az ışıkla yaşayabilen, köklerini kayaya tutunarak büyüyen dayanıklı bir bitki.', en: 'A hardy plant that thrives in low light and grows attached to rocks.' },
  },
  {
    id: 'vallis', water: 'fresh', rarity: 'common', level: 2, price: 50, type: 'grass', light: 1,
    growTime: 10 * M, beauty: 4, o2: 5, clean: 0.8, trim: 30, sites: [], hide: true, w: 9, h: 28,
    c1: '#3f8f3a', c2: '#7cc56a',
    name: { tr: 'Vallisneria', en: 'Vallisneria' },
    fact: { tr: 'Uzun şerit yapraklarıyla arka plan için idealdir ve hızla yayılır.', en: 'Its long ribbon leaves make an ideal background and it spreads fast.' },
  },
  {
    id: 'anubias', water: 'fresh', rarity: 'uncommon', level: 3, price: 90, type: 'broad', light: 1,
    growTime: 25 * M, beauty: 6, o2: 2, clean: 0.4, trim: 55, sites: ['broadleaf'], w: 11, h: 10,
    c1: '#1b5e20', c2: '#43a047',
    name: { tr: 'Anubias', en: 'Anubias' },
    fact: { tr: 'Geniş yaprakları melek balıkları gibi türlere yumurtlama yüzeyi sağlar.', en: 'Its broad leaves give species like angelfish a place to spawn.' },
  },
  {
    id: 'javaMoss', water: 'fresh', rarity: 'common', level: 4, price: 60, type: 'moss', light: 1,
    growTime: 15 * M, beauty: 3, o2: 2, clean: 0.6, trim: 35, sites: ['moss'], w: 11, h: 5,
    c1: '#2e6b2f', c2: '#58a55c',
    name: { tr: 'Java Yosunu', en: 'Java Moss' },
    fact: { tr: 'Karidesler için vazgeçilmezdir; yavrular yosunun içinde saklanır.', en: 'Essential for shrimp; their babies hide inside the moss.' },
  },
  {
    id: 'wisteria', water: 'fresh', rarity: 'uncommon', level: 5, price: 110, type: 'stem', light: 1,
    growTime: 15 * M, beauty: 6, o2: 5, clean: 1.0, trim: 65, sites: [], hide: true, w: 10, h: 22,
    c1: '#4c9a2a', c2: '#8bd05a',
    name: { tr: 'Su Vistaryası', en: 'Water Wisteria' },
    fact: { tr: 'Hızlı büyür ve fazla besini emerek yosunlarla savaşır.', en: 'Grows fast and fights algae by absorbing excess nutrients.' },
  },
  {
    id: 'frogbit', water: 'fresh', rarity: 'uncommon', level: 6, price: 120, type: 'floating', light: 1,
    growTime: 15 * M, beauty: 5, o2: 3, clean: 1.2, trim: 70, sites: ['floating'], w: 14, h: 4,
    c1: '#3d8b37', c2: '#86c96b',
    name: { tr: 'Yüzen Kurbağa Otu', en: 'Frogbit' },
    fact: { tr: 'Yüzeyde gölge yapar; betalar köpük yuvalarını bunun altına kurar.', en: 'Shades the surface; bettas build their bubble nests under it.' },
  },
  {
    id: 'sword', water: 'fresh', rarity: 'uncommon', level: 7, price: 220, type: 'rosette', light: 2,
    growTime: 30 * M, beauty: 10, o2: 6, clean: 1.0, trim: 140, sites: ['broadleaf'], hide: true, w: 17, h: 22,
    c1: '#2e7d32', c2: '#66bb6a',
    name: { tr: 'Amazon Kılıcı', en: 'Amazon Sword' },
    fact: { tr: 'Büyük rozet yapısıyla akvaryumun odak noktası olur; Bitki LED ister.', en: 'Its big rosette becomes a centerpiece; it needs a Plant LED.' },
  },
  {
    id: 'carpet', water: 'fresh', rarity: 'uncommon', level: 8, price: 300, type: 'carpet', light: 2,
    growTime: 40 * M, beauty: 10, o2: 4, clean: 0.8, trim: 180, sites: [], w: 18, h: 3,
    c1: '#4caf50', c2: '#9ccc65',
    name: { tr: 'Monte Carlo Halısı', en: 'Monte Carlo Carpet' },
    fact: { tr: 'Zemini yeşil bir halı gibi kaplar.', en: 'Covers the ground like a green carpet.' },
  },
  {
    id: 'marimo', water: 'fresh', rarity: 'rare', level: 9, price: 400, type: 'ball', light: 1,
    growTime: 60 * M, beauty: 12, o2: 2, clean: 0.5, trim: 250, sites: ['moss'], w: 6, h: 6,
    c1: '#1f6f2a', c2: '#4caf50',
    name: { tr: 'Marimo Topu', en: 'Marimo Ball' },
    fact: { tr: 'Yılda yalnızca birkaç milimetre büyüyen, yüzyıllarca yaşayabilen bir yosun topu.', en: 'An algae ball that grows only a few millimetres a year and can live for centuries.' },
  },
  {
    id: 'rotala', water: 'fresh', rarity: 'uncommon', level: 10, price: 360, type: 'stem', light: 2,
    growTime: 30 * M, beauty: 11, o2: 5, clean: 1.0, trim: 220, sites: [], hide: true, w: 10, h: 24,
    c1: '#b0507a', c2: '#e889ac',
    name: { tr: 'Pembe Rotala', en: 'Pink Rotala' },
    fact: { tr: 'Güçlü ışık altında uç yaprakları pembeye döner.', en: 'Its tips turn pink under strong light.' },
  },
  {
    id: 'ludwigia', water: 'fresh', rarity: 'rare', level: 11, price: 650, type: 'stem', light: 3,
    growTime: 40 * M, beauty: 16, o2: 6, clean: 1.2, trim: 400, sites: [], hide: true, w: 10, h: 26,
    c1: '#b3261e', c2: '#ef5350',
    name: { tr: 'Kırmızı Ludwigia', en: 'Red Ludwigia' },
    fact: { tr: 'Tam spektrum ışıkta yakut kırmızısı renge bürünür.', en: 'Turns ruby red under full-spectrum light.' },
  },
  {
    id: 'lotus', water: 'fresh', rarity: 'epic', level: 14, price: 2200, type: 'lily', light: 2,
    growTime: 80 * M, beauty: 30, o2: 8, clean: 1.5, trim: 1300, sites: ['broadleaf'], hide: true, w: 20, h: 40,
    c1: '#8e2b2b', c2: '#d9534f', c3: '#6aa84f',
    name: { tr: 'Kaplan Lotusu', en: 'Tiger Lotus' },
    fact: { tr: 'Benekli kırmızı yaprakları yüzeye kadar uzanır.', en: 'Its speckled red leaves reach all the way to the surface.' },
  },
  // ------------------------------------------------------------ TUZLU SU (mercan & bitki)
  {
    id: 'caulerpa', water: 'marine', rarity: 'common', level: 12, price: 300, type: 'macro', light: 1,
    growTime: 15 * M, beauty: 5, o2: 5, clean: 2.0, trim: 180, sites: [], w: 11, h: 10,
    c1: '#2e7d32', c2: '#76c043',
    name: { tr: 'Kaulerpa', en: 'Caulerpa' },
    fact: { tr: 'Üzüm salkımına benzeyen bu makro alg, sudaki fazla besini emer.', en: 'This grape-like macroalga soaks up excess nutrients.' },
  },
  {
    id: 'zoa', water: 'marine', rarity: 'uncommon', level: 12, price: 700, type: 'zoa', light: 2,
    growTime: 40 * M, beauty: 12, o2: 1, clean: 0.2, trim: 420, sites: [], w: 9, h: 4,
    c1: '#16a34a', c2: '#f97316', c3: '#facc15',
    name: { tr: 'Zoantus Polipleri', en: 'Zoanthid Polyps' },
    fact: { tr: 'Renkli polip kolonileri; parçalanarak (frag) çoğaltılabilir.', en: 'Colorful polyp colonies that can be fragged and multiplied.' },
  },
  {
    id: 'mushroom', water: 'marine', rarity: 'uncommon', level: 13, price: 900, type: 'mushroom', light: 2,
    growTime: 40 * M, beauty: 12, o2: 1, clean: 0.3, trim: 540, sites: [], w: 10, h: 5,
    c1: '#7c3aed', c2: '#c084fc', c3: '#22d3ee',
    name: { tr: 'Mantar Mercan', en: 'Mushroom Coral' },
    fact: { tr: 'Yumuşak mercanlar arasında en kolay bakılanlardandır.', en: 'One of the easiest soft corals to keep.' },
  },
  {
    id: 'anemone', water: 'marine', rarity: 'rare', level: 13, price: 2000, type: 'anemone', light: 3,
    growTime: 60 * M, beauty: 22, o2: 1, clean: 0.2, trim: 1200, sites: ['anemone'], hide: true, w: 13, h: 11,
    c1: '#be185d', c2: '#f9a8d4', c3: '#fde68a',
    name: { tr: 'Deniz Şakayığı', en: 'Bubble-tip Anemone' },
    fact: { tr: 'Palyaço balıklarının evidir; onlar olmadan palyaçolar üremez.', en: "The clownfish's home; clownfish won't breed without one." },
  },
  {
    id: 'seagrass', water: 'marine', rarity: 'uncommon', level: 14, price: 800, type: 'seagrass', light: 2,
    growTime: 30 * M, beauty: 8, o2: 5, clean: 1.5, trim: 480, sites: ['holdfast'], hide: true, w: 10, h: 26,
    c1: '#65a30d', c2: '#bef264',
    name: { tr: 'Deniz Çayırı', en: 'Seagrass' },
    fact: { tr: 'Denizatları kuyruklarıyla bu otlara tutunarak dinlenir.', en: 'Seahorses rest by gripping these grasses with their tails.' },
  },
  {
    id: 'seafan', water: 'marine', rarity: 'rare', level: 15, price: 1800, type: 'fan', light: 2,
    growTime: 60 * M, beauty: 20, o2: 1, clean: 0.3, trim: 1100, sites: ['holdfast'], w: 13, h: 22,
    c1: '#c2410c', c2: '#fb923c',
    name: { tr: 'Deniz Yelpazesi', en: 'Sea Fan' },
    fact: { tr: 'Akıntıya dik büyüyerek suyun taşıdığı besinleri yakalar.', en: 'Grows across the current to catch drifting food.' },
  },
  {
    id: 'brain', water: 'marine', rarity: 'epic', level: 17, price: 4200, type: 'brain', light: 3,
    growTime: 100 * M, beauty: 32, o2: 1, clean: 0.3, trim: 2500, sites: [], w: 12, h: 8,
    c1: '#15803d', c2: '#86efac', c3: '#a855f7',
    name: { tr: 'Beyin Mercanı', en: 'Brain Coral' },
    fact: { tr: 'Kıvrımlı yüzeyiyle beyne benzer; yüzlerce yıl yaşayabilir.', en: 'Its grooved surface resembles a brain; it can live for centuries.' },
  },
  {
    id: 'acropora', water: 'marine', rarity: 'epic', level: 22, price: 9000, type: 'branch', light: 4,
    growTime: 150 * M, beauty: 45, o2: 1, clean: 0.3, trim: 5400, sites: [], w: 15, h: 16,
    c1: '#0891b2', c2: '#67e8f9', c3: '#a78bfa',
    name: { tr: 'Akropora', en: 'Acropora' },
    fact: { tr: 'Resiflerin inşa ustası sert mercan; Resif Pro LED olmadan büyümez.', en: 'The master builder of reefs; it will not grow without a Reef Pro LED.' },
  },
];

export const PLANTS_BY_ID: Record<string, PlantDef> = Object.fromEntries(PLANTS.map((p) => [p.id, p]));

export function getPlant(id: string): PlantDef {
  const p = PLANTS_BY_ID[id];
  if (!p) throw new Error(`Bilinmeyen bitki: ${id}`);
  return p;
}
