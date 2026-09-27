import type { CosmeticDef, TankTypeDef, WaterType } from '../game/types';

export const TANK_TYPES: TankTypeDef[] = [
  {
    id: 'fresh', level: 1, price: 0,
    name: { tr: 'Tatlı Su Akvaryumu', en: 'Freshwater Aquarium' },
    tiers: [
      { tier: 0, liters: 20, w: 40, h: 26, cap: 6, level: 1, price: 0, name: { tr: 'Nano Akvaryum', en: 'Nano Tank' } },
      { tier: 1, liters: 54, w: 60, h: 32, cap: 12, level: 3, price: 600, name: { tr: 'Küçük Akvaryum', en: 'Small Tank' } },
      { tier: 2, liters: 112, w: 80, h: 38, cap: 20, level: 6, price: 2500, name: { tr: 'Orta Akvaryum', en: 'Medium Tank' } },
      { tier: 3, liters: 240, w: 110, h: 45, cap: 32, level: 10, price: 9000, name: { tr: 'Büyük Akvaryum', en: 'Large Tank' } },
      { tier: 4, liters: 450, w: 150, h: 52, cap: 50, level: 15, price: 30000, name: { tr: 'Dev Akvaryum', en: 'Giant Tank' } },
      { tier: 5, liters: 1000, w: 200, h: 60, cap: 80, level: 22, price: 100000, name: { tr: 'Gösteri Akvaryumu', en: 'Showcase Tank' } },
    ],
  },
  {
    id: 'marine', level: 12, price: 12000,
    name: { tr: 'Resif Akvaryumu', en: 'Reef Aquarium' },
    tiers: [
      { tier: 0, liters: 150, w: 90, h: 42, cap: 20, level: 12, price: 0, name: { tr: 'Resif 150', en: 'Reef 150' } },
      { tier: 1, liters: 400, w: 140, h: 52, cap: 36, level: 18, price: 60000, name: { tr: 'Resif 400', en: 'Reef 400' } },
      { tier: 2, liters: 800, w: 190, h: 60, cap: 60, level: 26, price: 180000, name: { tr: 'Resif 800', en: 'Reef 800' } },
    ],
  },
];

export function getTankType(id: WaterType): TankTypeDef {
  return TANK_TYPES.find((t) => t.id === id)!;
}

export function getTier(type: WaterType, tier: number) {
  const t = getTankType(type);
  return t.tiers[Math.min(tier, t.tiers.length - 1)];
}

export const COSMETICS: CosmeticDef[] = [
  { id: 'deepBlue', kind: 'background', water: 'fresh', level: 1, price: 0, name: { tr: 'Derin Mavi', en: 'Deep Blue' } },
  { id: 'jungle', kind: 'background', water: 'fresh', level: 4, price: 500, name: { tr: 'Amazon Ormanı', en: 'Amazon Jungle' } },
  { id: 'rocky', kind: 'background', water: 'both', level: 8, price: 1500, name: { tr: 'Kayalık Göl', en: 'Rocky Lake' } },
  { id: 'sunken', kind: 'background', water: 'both', level: 5, pearls: 40, name: { tr: 'Batık Şehir', en: 'Sunken City' } },
  { id: 'nebula', kind: 'background', water: 'both', level: 5, pearls: 60, name: { tr: 'Gece Işıltısı', en: 'Starlight Nebula' } },
  { id: 'reef', kind: 'background', water: 'marine', level: 1, price: 0, name: { tr: 'Mercan Resifi', en: 'Coral Reef' } },
  { id: 'ocean', kind: 'background', water: 'marine', level: 14, price: 3000, name: { tr: 'Açık Okyanus', en: 'Open Ocean' } },
  { id: 'sand', kind: 'substrate', water: 'fresh', level: 1, price: 0, name: { tr: 'Nehir Kumu', en: 'River Sand' } },
  { id: 'rainbow', kind: 'substrate', water: 'fresh', level: 2, price: 250, name: { tr: 'Renkli Çakıl', en: 'Rainbow Gravel' } },
  { id: 'gravel', kind: 'substrate', water: 'both', level: 3, price: 300, name: { tr: 'Doğal Çakıl', en: 'Natural Gravel' } },
  { id: 'black', kind: 'substrate', water: 'both', level: 7, price: 900, name: { tr: 'Siyah Kum', en: 'Black Sand' } },
  { id: 'coralSand', kind: 'substrate', water: 'marine', level: 1, price: 0, name: { tr: 'Aragonit Kumu', en: 'Aragonite Sand' } },
];

export function getCosmetic(id: string): CosmeticDef | undefined {
  return COSMETICS.find((c) => c.id === id);
}
