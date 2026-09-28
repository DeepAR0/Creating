// Aqua Haven — ortak tip tanımları (veri, durum ve simülasyon)

export type Lang = 'tr' | 'en';
export type Text = { tr: string; en: string };

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type WaterType = 'fresh' | 'marine';
export type Zone = 'top' | 'mid' | 'bottom' | 'any';
export type Diet = 'omni' | 'carni' | 'herbi';
export type Temperament = 'peaceful' | 'semi' | 'aggressive';
export type Sex = 'M' | 'F';

export type CreatureKind =
  | 'fish'
  | 'shrimp'
  | 'snail'
  | 'crab'
  | 'crayfish'
  | 'frog'
  | 'axolotl'
  | 'jelly'
  | 'seahorse'
  | 'starfish';

/** Üreme için gereken yuva/ortam türleri */
export type SpawnSite = 'cave' | 'broadleaf' | 'floating' | 'anemone' | 'flat' | 'moss' | 'holdfast';

export type TraitId =
  | 'xpAura' // tanktaki tüm canlıların GP kazancını artırır
  | 'xpBoost' // bu canlının verdiği GP artar
  | 'fastGrow' // daha hızlı büyür
  | 'golden' // satış değeri artar
  | 'lucky' // şans baloncuğu (altın/inci) bırakır
  | 'algaeEater' // yosun temizler
  | 'scavenger' // dipteki artık yemi ve kiri temizler
  | 'healer' // diğer balıkları iyileştirir
  | 'schooling' // sürü halinde mutlu olur
  | 'shy' // saklanma yeri ister
  | 'territorial' // diğer barışçıl balıkları strese sokar
  | 'finNipper' // uzun yüzgeçlilere zarar verir
  | 'longFin' // uzun yüzgeçli
  | 'hardy' // kötü suya dayanıklı
  | 'nocturnal' // gece aktif
  | 'rivalMales'; // aynı türden iki erkek kavga eder

export interface Trait {
  id: TraitId;
  v?: number;
}

// ---------------------------------------------------------------------------
// Görünüm (prosedürel çizim parametreleri)
// ---------------------------------------------------------------------------

export type BodyShape =
  | 'torpedo'
  | 'oval'
  | 'deep'
  | 'disc'
  | 'round'
  | 'long'
  | 'betta'
  | 'arowana'
  | 'cory'
  | 'pleco'
  | 'tang'
  | 'puffer'
  | 'lion'
  | 'mandarin';

export type TailShape = 'fan' | 'fork' | 'round' | 'veil' | 'lyre' | 'split' | 'crescent' | 'sword';
export type FinShape = 'none' | 'small' | 'tall' | 'long' | 'sail' | 'spiky';

export type PatternType =
  | 'stripesV' // dikey bantlar
  | 'stripesH' // yatay çizgiler
  | 'neon' // neon şerit
  | 'spots' // benekler
  | 'dots' // ince noktalar
  | 'patches' // lekeler (koi, panda)
  | 'mask' // göz maskesi
  | 'bands' // beyaz bantlar (palyaço)
  | 'rearColor' // arka yarı farklı renk
  | 'frontColor' // ön yarı farklı renk
  | 'waves' // dalgalı çizgiler (diskus, mandarin)
  | 'scales' // pul dokusu
  | 'marble' // mermer desen
  | 'tailSpot' // kuyruk gözü (oskar)
  | 'lionStripes'
  | 'palette' // mavi cerrah paleti
  | 'dorsalSpot'
  | 'lateral'; // yan çizgi

export interface PatternDef {
  type: PatternType;
  color: string;
  color2?: string;
  n?: number;
  w?: number;
  a?: number; // opaklık
  part?: 'lower' | 'upper' | 'full';
}

export interface FishLook {
  body: BodyShape;
  h: number; // gövde yüksekliği / uzunluk
  c1: string; // sırt rengi
  c2: string; // karın rengi
  fin: string; // yüzgeç rengi
  finEdge?: string;
  pattern?: PatternDef[];
  tail: TailShape;
  tailSize: number;
  dorsal: FinShape;
  dorsalSize: number;
  anal: FinShape;
  analSize?: number;
  pelvic?: 'none' | 'small' | 'long' | 'thread';
  eye?: number;
  eyeColor?: string;
  barbels?: boolean;
  shine?: number;
  glow?: string;
  hump?: number;
  lips?: string;
  tailColor?: string;
}

/** Balık dışı canlıların renk parametreleri */
export interface CreatureLook {
  c1: string;
  c2: string;
  c3?: string;
  glow?: string;
  mark?: 'stripes' | 'dots' | 'plain' | 'zebra' | 'leafy';
}

export interface VariantDef {
  id: string;
  name: Text;
  look: Partial<FishLook> & Partial<CreatureLook>;
  mult: number; // satış çarpanı
  w: number; // mutasyon ağırlığı
}

export interface BreedDef {
  method: 'live' | 'eggs' | 'mouth' | 'nest';
  needs: SpawnSite[]; // listedekilerden en az biri gerekir
  minHappy: number;
  minQ: number;
  temp: [number, number];
  time: number; // kur / çiftleşme süresi (sn)
  hatch: number; // yumurta açılma süresi (sn), canlı doğuranlarda 0
  brood: [number, number];
  cooldown: number;
  mutation: number;
}

export interface SpeciesDef {
  id: string;
  kind: CreatureKind;
  water: WaterType;
  rarity: Rarity;
  level: number;
  price: number;
  pearls?: number; // inci ile satılan özel türler
  exclusive?: 'starter';
  size: number; // yetişkin boyu (dünya birimi ≈ cm)
  bioload: number;
  growTime: number;
  sell: number;
  xp: number;
  adultXp: number;
  temp: [number, number];
  minQ: number;
  diet: Diet;
  temper: Temperament;
  zone: Zone;
  speed: number;
  hunger: number; // tam tokluktan açlığa saniye
  beauty: number;
  traits: Trait[];
  school?: number;
  minTier?: number;
  needsDecor?: string;
  breed?: BreedDef;
  look: FishLook | CreatureLook;
  lookF?: Partial<FishLook>;
  variants?: VariantDef[];
  name: Text;
  latin: string;
  fact: Text;
}

export type PlantType =
  | 'fern'
  | 'broad'
  | 'moss'
  | 'grass'
  | 'stem'
  | 'rosette'
  | 'floating'
  | 'ball'
  | 'lily'
  | 'carpet'
  | 'macro'
  | 'zoa'
  | 'mushroom'
  | 'fan'
  | 'anemone'
  | 'brain'
  | 'branch'
  | 'seagrass';

export interface PlantDef {
  id: string;
  water: WaterType;
  rarity: Rarity;
  level: number;
  price: number;
  pearls?: number;
  type: PlantType;
  light: number;
  growTime: number;
  beauty: number;
  o2: number;
  clean: number;
  trim: number;
  sites: SpawnSite[];
  hide?: boolean;
  w: number;
  h: number;
  c1: string;
  c2: string;
  c3?: string;
  name: Text;
  fact: Text;
}

export type DecorArt =
  | 'pebbles'
  | 'rockpile'
  | 'shells'
  | 'driftwood'
  | 'cave'
  | 'slate'
  | 'chest'
  | 'diver'
  | 'castle'
  | 'ship'
  | 'volcano'
  | 'bridge'
  | 'columns'
  | 'head'
  | 'amphora'
  | 'crystal'
  | 'lighthouse'
  | 'clam'
  | 'temple'
  | 'dragon'
  | 'palace'
  | 'liverock'
  | 'arch'
  | 'anchor'
  | 'flowerPot'
  | 'pagoda'
  | 'sandcastle'
  | 'tiki'
  | 'pumpkin'
  | 'cauldron'
  | 'snowman'
  | 'giftTree';

export interface DecorDef {
  id: string;
  water: WaterType | 'both';
  rarity: Rarity;
  level: number;
  price: number;
  pearls?: number;
  exclusive?: 'vip' | 'season'; // season: yalnızca etkinlik ödülü olarak kazanılır
  season?: string; // yalnızca bu etkinlik sürerken satılır
  art: DecorArt;
  w: number;
  h: number;
  beauty: number;
  hide?: boolean;
  sites?: SpawnSite[];
  o2?: number;
  aura?: number;
  glow?: string;
  pearlGen?: number; // her x saniyede 1 inci üretir
  name: Text;
  desc: Text;
}

export type EquipSlot = 'filter' | 'heater' | 'chiller' | 'air' | 'light' | 'uv' | 'feeder' | 'co2';

export interface EquipDef {
  slot: EquipSlot;
  tier: number;
  level: number;
  price: number;
  pearls?: number;
  eff?: number; // filtre verimi
  dirtClean?: number; // saatlik kir temizliği
  maxTemp?: number;
  minTemp?: number;
  o2?: number;
  light?: number;
  algaeMult?: number;
  sickMult?: number;
  interval?: number;
  plantMult?: number;
  name: Text;
  desc: Text;
}

export interface FoodDef {
  id: string;
  level: number;
  price: number; // paket fiyatı
  pack: number; // paketteki tutam sayısı
  pearls?: number;
  water: WaterType | 'both';
  particles: number;
  nutrition: number;
  xpMult: number;
  boost: number; // büyüme bonusu
  boostTime: number;
  sink: number;
  diet: Record<Diet, number>;
  color: string;
  shape: 'flake' | 'pellet' | 'tablet' | 'worm' | 'shrimp';
  name: Text;
  desc: Text;
}

export interface ItemDef {
  id: 'medicine' | 'elixir' | 'mysteryEgg';
  level: number;
  price?: number;
  pearls?: number;
  name: Text;
  desc: Text;
}

export interface CosmeticDef {
  id: string;
  kind: 'background' | 'substrate';
  water: WaterType | 'both';
  level: number;
  price?: number;
  pearls?: number;
  name: Text;
}

export interface TankTierDef {
  tier: number;
  liters: number;
  w: number;
  h: number;
  cap: number;
  level: number;
  price: number;
  name: Text;
}

export interface TankTypeDef {
  id: WaterType;
  level: number;
  price: number;
  tiers: TankTierDef[];
  name: Text;
}

// ---------------------------------------------------------------------------
// Kayıtlı oyun durumu
// ---------------------------------------------------------------------------

export interface FishState {
  id: string;
  sp: string;
  name: string;
  sex: Sex;
  g: number; // büyüme 0..1
  food: number; // tokluk 0..100
  hp: number; // sağlık 0..100
  joy: number; // mutluluk 0..100
  var?: string;
  sick?: number; // >0 ise hasta (şiddet)
  bred?: boolean; // evde üretildi
  born: number;
  fav?: boolean;
  boost?: number; // büyüme bonusu süresi
  boostAmt?: number;
  cd?: number; // üreme bekleme süresi
  luck?: number; // şans baloncuğuna kalan süre
  crit?: number; // sağlık 0'dayken geçen süre
  adultAt?: number;
}

export interface PlantState {
  id: string;
  def: string;
  x: number;
  z: number;
  g: number;
  flip?: boolean;
}

export interface DecorState {
  id: string;
  def: string;
  x: number;
  z: number;
  flip?: boolean;
  gen?: number; // inci üretim sayacı
}

export interface Clutch {
  id: string;
  sp: string;
  stage: 'court' | 'eggs';
  t: number; // kalan süre
  total: number;
  parents: [string, string];
  site?: string; // yuva olarak kullanılan dekor/bitki id
  paused?: boolean;
  speedups?: number;
}

export interface TankState {
  id: string;
  type: WaterType;
  tier: number;
  fish: FishState[];
  plants: PlantState[];
  decor: DecorState[];
  equip: Partial<Record<EquipSlot, number>>;
  targetTemp: number;
  temp: number;
  pollution: number; // 0..100 (kalite = 100 - kirlilik)
  dirt: number; // 0..100 dipteki kir
  oxygen: number;
  algae: number[]; // cam yosun ızgarası 0..1
  light: boolean;
  clutches: Clutch[];
  tips: number;
  background: string;
  substrate: string;
  feederT: number;
}

export type StatKey =
  | 'fed'
  | 'sold'
  | 'grown'
  | 'bred'
  | 'mutations'
  | 'wiped'
  | 'vacuumed'
  | 'waterChanges'
  | 'coinsEarned'
  | 'bought'
  | 'decorPlaced'
  | 'lucky'
  | 'trimmed'
  | 'tipsCollected'
  | 'questsDone'
  | 'adsWatched'
  | 'eggsOpened'
  | 'photos';

export type QuestKind =
  | 'feed'
  | 'sell'
  | 'earn'
  | 'wipe'
  | 'vacuum'
  | 'waterChange'
  | 'grow'
  | 'buyFish'
  | 'buyDecor'
  | 'collect'
  | 'breed'
  | 'trim'
  | 'lucky'
  | 'photo';

export interface QuestState {
  id: string;
  kind: QuestKind;
  target: number;
  progress: number;
  coins: number;
  xp: number;
  pearls: number;
  claimed: boolean;
}

export interface DailyState {
  day: string; // YYYY-MM-DD (yerel)
  quests: QuestState[];
  bonusClaimed: boolean;
  rerolls: number;
  ads: Record<string, number>; // ödüllü reklam günlük sayaçları
  hot: string[]; // günün gözde türleri (+%50)
  loginStreak: number; // 1..7 döngü
  loginClaimed: boolean;
  lastLoginDay: string;
  vipClaimed: boolean;
}

/** Sezon etkinliği ilerlemesi (hedefler başlangıçtaki seviyeye göre sabitlenir) */
export interface SeasonState {
  key: string; // etkinlik kimliği + başlangıç yılı
  id: string;
  until: number;
  targets: number[];
  progress: number[];
  claimed: boolean[];
  done: boolean;
}

export interface Settings {
  music: boolean;
  sfx: boolean;
  haptics: boolean;
  notifications: boolean;
  lang: 'auto' | Lang;
  quality: 'high' | 'low';
}

export interface IapState {
  removeAds: boolean;
  vipUntil: number;
  starter: boolean;
  starterGranted: boolean;
  granted: string[]; // işlenen işlem kimlikleri
}

export interface GameState {
  v: number;
  seed: number;
  createdAt: number;
  lastSeen: number;
  playTime: number;
  player: { level: number; xp: number; coins: number; pearls: number };
  tanks: TankState[];
  active: number;
  inv: {
    food: Record<string, number>;
    items: Record<string, number>;
    decor: Record<string, number>;
    plants: Record<string, number>;
  };
  owned: Record<string, boolean>; // kozmetikler
  selectedFood: string;
  stats: Record<StatKey, number>;
  discovered: Record<string, number>;
  achievements: Record<string, number>;
  daily: DailyState;
  settings: Settings;
  iap: IapState;
  tutorial: { step: number; done: boolean };
  flags: Record<string, number>;
  tipCapBonus: number;
  season?: SeasonState;
  nextId: number;
}
