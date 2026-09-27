import type { QuestKind, StatKey, Text } from '../game/types';

export interface QuestTemplate {
  kind: QuestKind;
  minLevel: number;
  weight: number;
  /** [kolay, orta, zor] hedefleri, seviyeye göre */
  target: (level: number, diff: number) => number;
  text: Text; // {n} hedef ile değiştirilir
}

const r = (x: number) => Math.max(1, Math.round(x));

export const QUEST_TEMPLATES: QuestTemplate[] = [
  { kind: 'feed', minLevel: 1, weight: 10, target: (l, d) => r((15 + l * 2) * (1 + d * 0.7)),
    text: { tr: 'Balıkları {n} kez besle', en: 'Feed your fish {n} times' } },
  { kind: 'sell', minLevel: 1, weight: 9, target: (l, d) => r((2 + l * 0.15) * (1 + d)),
    text: { tr: '{n} yetişkin canlı sat', en: 'Sell {n} adult animals' } },
  { kind: 'earn', minLevel: 2, weight: 7, target: (l, d) => r(Math.round((150 * Math.pow(l, 1.6)) * (1 + d)) / 10) * 10,
    text: { tr: 'Satışlardan {n} altın kazan', en: 'Earn {n} coins from sales' } },
  { kind: 'grow', minLevel: 1, weight: 8, target: (l, d) => r((2 + l * 0.1) * (1 + d * 0.8)),
    text: { tr: '{n} canlıyı yetişkinliğe ulaştır', en: 'Raise {n} animals to adulthood' } },
  { kind: 'wipe', minLevel: 1, weight: 6, target: (_l, d) => r(3 + d * 3),
    text: { tr: 'Camdaki yosunu sil ({n} birim)', en: 'Wipe algae off the glass ({n} units)' } },
  { kind: 'vacuum', minLevel: 2, weight: 5, target: (_l, d) => r(10 + d * 10),
    text: { tr: 'Sifonla {n} kir lekesi temizle', en: 'Vacuum {n} bits of dirt' } },
  { kind: 'waterChange', minLevel: 2, weight: 4, target: (_l, d) => r(1 + d),
    text: { tr: '{n} kez su değişimi yap', en: 'Do {n} water changes' } },
  { kind: 'buyFish', minLevel: 1, weight: 6, target: (_l, d) => r(2 + d * 2),
    text: { tr: '{n} yeni canlı satın al', en: 'Buy {n} new animals' } },
  { kind: 'buyDecor', minLevel: 2, weight: 3, target: () => 1,
    text: { tr: 'Bir dekor veya bitki satın al', en: 'Buy a decoration or plant' } },
  { kind: 'collect', minLevel: 2, weight: 5, target: (_l, d) => r(2 + d),
    text: { tr: 'Ziyaretçi kutusunu {n} kez topla', en: 'Collect the visitor box {n} times' } },
  { kind: 'breed', minLevel: 5, weight: 4, target: () => 1,
    text: { tr: 'Bir üreme başlat', en: 'Start a breeding' } },
  { kind: 'trim', minLevel: 3, weight: 3, target: (_l, d) => r(1 + d),
    text: { tr: '{n} olgun bitkiyi buda', en: 'Trim {n} mature plants' } },
  { kind: 'lucky', minLevel: 5, weight: 2, target: () => 1,
    text: { tr: 'Bir şans baloncuğu yakala', en: 'Catch a lucky bubble' } },
];

export interface AchievementDef {
  id: string;
  stat: StatKey | 'level' | 'species';
  tiers: number[];
  pearls: number[];
  text: Text; // {n}
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'feeder', stat: 'fed', tiers: [50, 500, 5000], pearls: [3, 8, 20], text: { tr: '{n} kez besle', en: 'Feed {n} times' } },
  { id: 'merchant', stat: 'sold', tiers: [1, 25, 250, 1000], pearls: [2, 5, 15, 40], text: { tr: '{n} canlı sat', en: 'Sell {n} animals' } },
  { id: 'grower', stat: 'grown', tiers: [1, 20, 200], pearls: [2, 8, 25], text: { tr: '{n} canlı büyüt', en: 'Raise {n} animals' } },
  { id: 'breeder', stat: 'bred', tiers: [1, 10, 50], pearls: [5, 15, 40], text: { tr: '{n} yavru üret', en: 'Breed {n} babies' } },
  { id: 'geneticist', stat: 'mutations', tiers: [1, 5, 20], pearls: [10, 25, 60], text: { tr: '{n} nadir renk mutasyonu keşfet', en: 'Discover {n} rare color mutations' } },
  { id: 'cleaner', stat: 'wiped', tiers: [5, 50, 300], pearls: [2, 8, 20], text: { tr: '{n} birim yosun temizle', en: 'Clean {n} units of algae' } },
  { id: 'aquarist', stat: 'waterChanges', tiers: [1, 20, 100], pearls: [2, 8, 20], text: { tr: '{n} su değişimi yap', en: 'Do {n} water changes' } },
  { id: 'tycoon', stat: 'coinsEarned', tiers: [1000, 50000, 1000000], pearls: [3, 15, 50], text: { tr: 'Toplam {n} altın kazan', en: 'Earn {n} coins in total' } },
  { id: 'collector', stat: 'species', tiers: [5, 15, 30, 44], pearls: [5, 15, 30, 80], text: { tr: '{n} tür keşfet', en: 'Discover {n} species' } },
  { id: 'expert', stat: 'level', tiers: [5, 10, 20, 30], pearls: [5, 10, 25, 50], text: { tr: '{n}. seviyeye ulaş', en: 'Reach level {n}' } },
  { id: 'designer', stat: 'decorPlaced', tiers: [3, 15, 40], pearls: [2, 6, 15], text: { tr: '{n} dekor/bitki yerleştir', en: 'Place {n} decorations or plants' } },
  { id: 'lucky', stat: 'lucky', tiers: [1, 25, 200], pearls: [2, 8, 20], text: { tr: '{n} şans baloncuğu yakala', en: 'Catch {n} lucky bubbles' } },
  { id: 'gardener', stat: 'trimmed', tiers: [1, 25, 150], pearls: [2, 8, 20], text: { tr: '{n} bitki buda', en: 'Trim {n} plants' } },
  { id: 'dedicated', stat: 'questsDone', tiers: [3, 50, 300], pearls: [3, 10, 30], text: { tr: '{n} günlük görev tamamla', en: 'Complete {n} daily quests' } },
];

export type LoginReward =
  | { kind: 'coins'; amount: number }
  | { kind: 'pearls'; amount: number }
  | { kind: 'food'; id: string; amount: number }
  | { kind: 'items'; items: Record<string, number> }
  | { kind: 'egg'; pearls: number };

/** 7 günlük giriş takvimi (seviyeye göre ölçeklenir) */
export function loginRewardFor(day: number, levelScaleValue: number): LoginReward {
  switch (day) {
    case 1: return { kind: 'coins', amount: Math.round(100 * levelScaleValue) };
    case 2: return { kind: 'food', id: 'flakes', amount: 40 };
    case 3: return { kind: 'pearls', amount: 5 };
    case 4: return { kind: 'coins', amount: Math.round(250 * levelScaleValue) };
    case 5: return { kind: 'items', items: { medicine: 1, elixir: 2 } };
    case 6: return { kind: 'pearls', amount: 10 };
    default: return { kind: 'egg', pearls: 15 };
  }
}
