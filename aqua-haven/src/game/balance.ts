// Tüm denge sabitleri tek yerde. Oyun hızını ayarlamak için burayı düzenleyin.

export const BAL = {
  START_COINS: 150,
  START_PEARLS: 15,
  START_FOOD: { flakes: 40 } as Record<string, number>,

  ROOM_TEMP: 22,
  TEMP_RATE: 0.05, // °C/sn hedefe yaklaşma

  // Su kalitesi
  POLLUTION_K: 0.012, // tam stok, filtresiz: sn başına kirlilik
  DIRT_K: 0.004, // tam stokta sn başına dip kiri
  DIRT_POLLUTION: 0.00008, // kir birimi başına sn’de kirlilik
  PLANT_CLEAN_MULT: 3, // bitki "clean" değeri × bu = saatlik kirlilik azalması
  SCAVENGER_DIRT: 6, // scavenger v başına saatlik kir temizliği
  FOOD_BOTTOM_LIFE: 40, // dipteki yem kaç sn sonra çürür
  FOOD_DECAY_DIRT: 0.35,
  WATER_CHANGE_FRACTION: 0.5,
  WATER_CHANGE_COST_PER_L: 0.5,
  VACUUM_PER_SPECK: 1, // kir lekeleri
  QUICK_CLEAN_COST_PER_L: 2,

  // Oksijen
  O2_BASE: 60,
  O2_CONSUMPTION: 30, // tam stokta tüketim
  O2_RATE: 0.02, // hedefe yaklaşma oranı / sn

  // Yosun
  ALGAE_COLS: 24,
  ALGAE_ROWS: 12,
  ALGAE_RATE: 0.0001,
  ALGAE_EAT: 0.004, // algaeEater v başına sn’de ızgara birimi (nano alanına göre)
  NANO_AREA: 40 * 26,

  // Balık
  GROW_MIN_FOOD: 30,
  FULL_FOOD: 92, // bu tokluğun üstünde yem aramaz
  HEAL_PER_MIN: 1,
  STARVE_DMG_PER_MIN: 1.2,
  SICK_DMG_PER_MIN: 1.5,
  SICK_BASE_CHANCE: 0.02, // dakikada, stres başına
  CONTAGION: 0.01,
  CRIT_DEATH_SEC: 180,
  OFFLINE_HP_FLOOR: 25,
  OFFLINE_POLLUTION_CAP: 65,
  OFFLINE_MAX_SEC: 7 * 24 * 3600,
  PROTECT_LEVEL: 4, // bu seviyenin altında balıklar ölmez / hastalanmaz

  // Ekonomi
  SELL_CURVE_MIN: 0.2,
  SELL_CURVE_POW: 1.4,
  HOT_MULT: 1.5,
  BRED_MULT: 1.2,
  SELL_XP_MULT: 0.25,
  TIP_RATE: 0.08, // güzellik puanı başına dakikada altın
  TIP_CAP_MIN: 180,
  VIP_TIP_CAP_MIN: 480,
  VIP_TIP_MULT: 2,
  VIP_XP: 0.1,
  VIP_DAILY_PEARLS: 20,
  AURA_CAP: 1,
  LUCKY_INTERVAL: 10 * 60,
  ELIXIR_GROWTH: 0.35,
  PEARL_TO_COIN: 100, // 1 inci = seviye başına bu kadar altın (takas)

  // Yavru satın alma büyümesi
  BABY_START_G: 0.05,
};

/** Bir sonraki seviye için gereken GP */
export function xpToNext(level: number): number {
  // Erken seviyeler hızlı; 10. seviyeden sonra kademeli yavaşlama (uzun ömürlü ilerleme)
  const late = 1 + Math.max(0, level - 10) * 0.1;
  return Math.round(50 * Math.pow(level, 2.5) * late);
}

export const MAX_LEVEL = 50;

export function levelRewards(level: number): { coins: number; pearls: number } {
  return { coins: 60 * level, pearls: 2 + (level % 5 === 0 ? 10 : 0) };
}

/** Seviyeye göre ödül ölçeği (görev ve günlük ödüller) */
export function levelScale(level: number): number {
  return 1 + 0.35 * (level - 1);
}
