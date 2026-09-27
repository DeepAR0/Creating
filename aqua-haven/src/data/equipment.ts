import type { EquipDef, EquipSlot } from '../game/types';

// Ekipmanlar tank başınadır. tier 0 = yok.
export const EQUIPMENT: EquipDef[] = [
  // Filtre: kirliliğin ne kadarını nötralize ettiği (eff) ve saatlik dip temizliği
  { slot: 'filter', tier: 1, level: 1, price: 0, eff: 0.3, dirtClean: 4, o2: 4,
    name: { tr: 'Sünger Filtre', en: 'Sponge Filter' }, desc: { tr: 'Basit ama güvenilir başlangıç filtresi.', en: 'A simple but reliable starter filter.' } },
  { slot: 'filter', tier: 2, level: 3, price: 350, eff: 0.45, dirtClean: 8, o2: 6,
    name: { tr: 'Askı Filtre', en: 'Hang-on Filter' }, desc: { tr: 'Daha güçlü akış ve temizlik.', en: 'Stronger flow and cleaning.' } },
  { slot: 'filter', tier: 3, level: 7, price: 1800, eff: 0.6, dirtClean: 12, o2: 8,
    name: { tr: 'Dış Filtre', en: 'Canister Filter' }, desc: { tr: 'Çok katmanlı biyolojik filtrasyon.', en: 'Multi-stage biological filtration.' } },
  { slot: 'filter', tier: 4, level: 13, price: 7500, eff: 0.72, dirtClean: 18, o2: 10,
    name: { tr: 'Pro Dış Filtre', en: 'Pro Canister' }, desc: { tr: 'Kalabalık tanklar için yüksek kapasite.', en: 'High capacity for busy tanks.' } },
  { slot: 'filter', tier: 5, level: 19, price: 24000, eff: 0.82, dirtClean: 25, o2: 12,
    name: { tr: 'Sump Sistemi', en: 'Sump System' }, desc: { tr: 'Profesyonel seviye su arıtma.', en: 'Professional-grade water treatment.' } },
  // Isıtıcı: ulaşılabilecek en yüksek sıcaklık
  { slot: 'heater', tier: 1, level: 2, price: 150, maxTemp: 26,
    name: { tr: '25W Isıtıcı', en: '25W Heater' }, desc: { tr: 'Suyu 26°C’ye kadar ısıtır.', en: 'Heats water up to 26°C.' } },
  { slot: 'heater', tier: 2, level: 6, price: 900, maxTemp: 29,
    name: { tr: '100W Isıtıcı', en: '100W Heater' }, desc: { tr: 'Suyu 29°C’ye kadar ısıtır.', en: 'Heats water up to 29°C.' } },
  { slot: 'heater', tier: 3, level: 12, price: 3500, maxTemp: 32,
    name: { tr: 'Titanyum Pro Isıtıcı', en: 'Titanium Pro Heater' }, desc: { tr: 'Hassas kontrol, 32°C’ye kadar.', en: 'Precise control up to 32°C.' } },
  // Soğutucu: oda sıcaklığının altına inmeyi sağlar
  { slot: 'chiller', tier: 1, level: 16, price: 6000, minTemp: 14,
    name: { tr: 'Akvaryum Soğutucu', en: 'Aquarium Chiller' }, desc: { tr: 'Aksolotl gibi soğuk su canlıları için 14°C’ye kadar soğutur.', en: 'Cools down to 14°C for cold-water animals like axolotls.' } },
  // Hava motoru
  { slot: 'air', tier: 1, level: 2, price: 120, o2: 18,
    name: { tr: 'Hava Motoru', en: 'Air Pump' }, desc: { tr: 'Hava taşından kabarcık vererek oksijeni artırır.', en: 'Adds oxygen through an air stone.' } },
  { slot: 'air', tier: 2, level: 7, price: 900, o2: 30,
    name: { tr: 'Çift Çıkışlı Motor', en: 'Dual Air Pump' }, desc: { tr: 'Daha güçlü kabarcık perdesi.', en: 'A stronger bubble curtain.' } },
  { slot: 'air', tier: 3, level: 14, price: 4000, o2: 45,
    name: { tr: 'Sessiz Pro Kompresör', en: 'Silent Pro Compressor' }, desc: { tr: 'Büyük tanklar için maksimum oksijen.', en: 'Maximum oxygen for large tanks.' } },
  // Aydınlatma
  { slot: 'light', tier: 1, level: 1, price: 0, light: 1, algaeMult: 1,
    name: { tr: 'Basit LED', en: 'Basic LED' }, desc: { tr: 'Az ışık isteyen bitkiler için yeterli.', en: 'Enough for low-light plants.' } },
  { slot: 'light', tier: 2, level: 5, price: 600, light: 2, algaeMult: 1.15,
    name: { tr: 'Bitki LED', en: 'Plant LED' }, desc: { tr: 'Bitkiler 1.5 kat hızlı büyür.', en: 'Plants grow 1.5× faster.' } },
  { slot: 'light', tier: 3, level: 11, price: 3200, light: 3, algaeMult: 1.3,
    name: { tr: 'Tam Spektrum LED', en: 'Full Spectrum LED' }, desc: { tr: 'Kırmızı bitkiler ve güçlü mercanlar için.', en: 'For red plants and demanding corals.' } },
  { slot: 'light', tier: 4, level: 15, price: 8000, light: 4, algaeMult: 1.4,
    name: { tr: 'Resif Pro LED', en: 'Reef Pro LED' }, desc: { tr: 'Sert mercanlar için gereken yoğun ışık.', en: 'Intense light required by hard corals.' } },
  // UV
  { slot: 'uv', tier: 1, level: 10, price: 2800, algaeMult: 0.5, sickMult: 0.5,
    name: { tr: 'UV Sterilizatör', en: 'UV Sterilizer' }, desc: { tr: 'Yosunu ve hastalık riskini yarıya indirir.', en: 'Halves algae growth and disease risk.' } },
  // Otomatik yemlik
  { slot: 'feeder', tier: 1, level: 7, price: 1500, interval: 30 * 60,
    name: { tr: 'Otomatik Yemlik', en: 'Auto Feeder' }, desc: { tr: '30 dakikada bir, siz yokken bile besler (envanterden yem kullanır).', en: 'Feeds every 30 min, even while you are away (uses food from inventory).' } },
  { slot: 'feeder', tier: 2, level: 14, price: 12000, interval: 15 * 60,
    name: { tr: 'Akıllı Yemlik', en: 'Smart Feeder' }, desc: { tr: '15 dakikada bir besler.', en: 'Feeds every 15 minutes.' } },
  // CO2
  { slot: 'co2', tier: 1, level: 16, price: 5500, plantMult: 1.8, algaeMult: 0.8,
    name: { tr: 'CO₂ Sistemi', en: 'CO₂ System' }, desc: { tr: 'Bitkiler 1.8 kat hızlı büyür, yosun azalır.', en: 'Plants grow 1.8× faster and algae is reduced.' } },
];

export const SLOTS: EquipSlot[] = ['filter', 'heater', 'chiller', 'air', 'light', 'uv', 'feeder', 'co2'];

export function getEquip(slot: EquipSlot, tier: number): EquipDef | undefined {
  return EQUIPMENT.find((e) => e.slot === slot && e.tier === tier);
}

export function maxTier(slot: EquipSlot): number {
  return EQUIPMENT.filter((e) => e.slot === slot).reduce((m, e) => Math.max(m, e.tier), 0);
}
