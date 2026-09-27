import type { Text } from '../game/types';

// App Store Connect'te bu kimliklerle ürün oluşturun (birebir aynı olmalı).
export type ProductType = 'consumable' | 'nonconsumable' | 'subscription';

export interface ProductDef {
  id: string;
  type: ProductType;
  pearls?: number;
  bonusPct?: number;
  tag?: 'popular' | 'best';
  /** Mağazadan fiyat alınamazsa gösterilecek tahmini fiyat */
  fallbackPrice: string;
  name: Text;
}

export const PRODUCTS: ProductDef[] = [
  { id: 'aquahaven.pearls.80', type: 'consumable', pearls: 80, fallbackPrice: '$0.99',
    name: { tr: 'Bir Avuç İnci', en: 'Handful of Pearls' } },
  { id: 'aquahaven.pearls.500', type: 'consumable', pearls: 500, bonusPct: 10, tag: 'popular', fallbackPrice: '$4.99',
    name: { tr: 'İnci Kesesi', en: 'Pouch of Pearls' } },
  { id: 'aquahaven.pearls.1200', type: 'consumable', pearls: 1200, bonusPct: 20, fallbackPrice: '$9.99',
    name: { tr: 'İnci Sandığı', en: 'Chest of Pearls' } },
  { id: 'aquahaven.pearls.2600', type: 'consumable', pearls: 2600, bonusPct: 30, tag: 'best', fallbackPrice: '$19.99',
    name: { tr: 'İnci Hazinesi', en: 'Treasure of Pearls' } },
  { id: 'aquahaven.pearls.7000', type: 'consumable', pearls: 7000, bonusPct: 40, fallbackPrice: '$49.99',
    name: { tr: 'Okyanus Hazinesi', en: 'Ocean Hoard' } },
  { id: 'aquahaven.removeads', type: 'nonconsumable', fallbackPrice: '$3.99',
    name: { tr: 'Reklamları Kaldır', en: 'Remove Ads' } },
  { id: 'aquahaven.starterpack', type: 'nonconsumable', fallbackPrice: '$1.99',
    name: { tr: 'Başlangıç Paketi', en: 'Starter Pack' } },
  { id: 'aquahaven.vip.monthly', type: 'subscription', fallbackPrice: '$4.99',
    name: { tr: 'VIP Akvaryum Kulübü', en: 'VIP Aquarium Club' } },
];

export const PRODUCT_IDS = {
  removeAds: 'aquahaven.removeads',
  starter: 'aquahaven.starterpack',
  vip: 'aquahaven.vip.monthly',
};

/** Başlangıç paketinin içeriği */
export const STARTER_PACK = {
  pearls: 250,
  coins: 5000,
  species: 'goldenBetta',
  feeder: true,
  food: { golden: 15, bloodworm: 25 },
};

/** Ödüllü reklam yerleşimleri ve günlük sınırları */
export const REWARDED_LIMITS: Record<string, number> = {
  freePearls: 5,
  doubleTips: 6,
  speedBreed: 10,
  boostGrowth: 10,
  doubleQuest: 3,
  cleanTank: 4,
  rerollQuest: 3,
  revive: 3,
};

export const FREE_PEARLS_PER_AD = 3;

/** Geçiş reklamı kuralları (oyuncuyu rahatsız etmeyecek sıklıkta) */
export const INTERSTITIAL_RULES = {
  minLevel: 4,
  minSessionSec: 150,
  minIntervalSec: 240,
  sellsPerAd: 5,
};
