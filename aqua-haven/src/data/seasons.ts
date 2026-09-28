import type { QuestKind, Text } from '../game/types';

export type SeasonBonus = 'xp' | 'growth' | 'tips' | 'sell';

export interface SeasonTask {
  kind: QuestKind;
  /** Günlük görevin zor hedefinin kaç katı */
  mult: number;
  pearls: number;
}

export interface SeasonDef {
  id: string;
  /** [ay, gün] — iki uç da dahil; bitiş başlangıçtan önceyse yılbaşını aşar */
  from: [number, number];
  to: [number, number];
  icon: string;
  color: string;
  bonus: { kind: SeasonBonus; v: number };
  decor: string[]; // etkinlik süresince satılan dekorlar
  reward: string; // tüm görevler bitince verilen dekor
  rewardPearls: number;
  fish: { sp: string; variant: string }[]; // etkinliğe özel renkte yavrular
  tasks: SeasonTask[];
  name: Text;
  desc: Text;
}

export const SEASONS: SeasonDef[] = [
  {
    id: 'spring', from: [3, 20], to: [4, 20], icon: '🌸', color: '#f9a8d4',
    bonus: { kind: 'growth', v: 0.25 }, decor: ['flowerPot'], reward: 'pagoda', rewardPearls: 30,
    fish: [{ sp: 'goldfish', variant: 'sakura' }],
    tasks: [
      { kind: 'feed', mult: 4, pearls: 5 },
      { kind: 'grow', mult: 4, pearls: 10 },
      { kind: 'trim', mult: 5, pearls: 10 },
      { kind: 'sell', mult: 4, pearls: 15 },
    ],
    name: { tr: 'Bahar Şenliği', en: 'Spring Festival' },
    desc: { tr: 'Kiraz çiçekleri açtı! Balıklar daha hızlı büyüyor.', en: 'The cherry trees are blooming! Fish grow faster.' },
  },
  {
    id: 'summer', from: [7, 1], to: [8, 15], icon: '🏖️', color: '#fde047',
    bonus: { kind: 'tips', v: 0.5 }, decor: ['sandcastle'], reward: 'tiki', rewardPearls: 30,
    fish: [{ sp: 'guppy', variant: 'sunset' }],
    tasks: [
      { kind: 'collect', mult: 6, pearls: 5 },
      { kind: 'wipe', mult: 5, pearls: 10 },
      { kind: 'feed', mult: 3, pearls: 10 },
      { kind: 'sell', mult: 4, pearls: 15 },
    ],
    name: { tr: 'Yaz Festivali', en: 'Summer Festival' },
    desc: { tr: 'Tatilciler akın ediyor: ziyaretçi geliri artıyor.', en: 'Holiday crowds are here: visitor income is up.' },
  },
  {
    id: 'halloween', from: [10, 15], to: [11, 7], icon: '🎃', color: '#fb923c',
    bonus: { kind: 'xp', v: 0.25 }, decor: ['pumpkin'], reward: 'cauldron', rewardPearls: 30,
    fish: [{ sp: 'betta', variant: 'pumpkin' }],
    tasks: [
      { kind: 'feed', mult: 4, pearls: 5 },
      { kind: 'vacuum', mult: 4, pearls: 10 },
      { kind: 'grow', mult: 4, pearls: 10 },
      { kind: 'sell', mult: 3, pearls: 15 },
    ],
    name: { tr: 'Cadılar Festivali', en: 'Spooky Festival' },
    desc: { tr: 'Balkabakları parlıyor! Her şeyden daha fazla GP kazan.', en: 'The pumpkins are glowing! Earn more XP from everything.' },
  },
  {
    id: 'winter', from: [12, 10], to: [1, 10], icon: '❄️', color: '#bae6fd',
    bonus: { kind: 'sell', v: 0.25 }, decor: ['snowman'], reward: 'giftTree', rewardPearls: 40,
    fish: [{ sp: 'neon', variant: 'frost' }],
    tasks: [
      { kind: 'sell', mult: 4, pearls: 5 },
      { kind: 'collect', mult: 5, pearls: 10 },
      { kind: 'feed', mult: 3, pearls: 10 },
      { kind: 'earn', mult: 3, pearls: 15 },
    ],
    name: { tr: 'Kış Festivali', en: 'Winter Festival' },
    desc: { tr: 'Yılbaşı alışverişi başladı: satış fiyatları yüksek.', en: 'Holiday shopping is on: sale prices are up.' },
  },
];

export function getSeason(id: string): SeasonDef | undefined {
  return SEASONS.find((x) => x.id === id);
}
