import { ACHIEVEMENTS } from '../data/progression';
import { GC_LEADERBOARDS, gcAchievementId } from '../config/gamecenter';
import { achievementValue } from './sim/quests';
import { beautyScore } from './sim/economy';
import type { GameState } from './types';

export function gcScores(s: GameState): { id: string; value: number }[] {
  return [
    { id: GC_LEADERBOARDS.level, value: s.player.level },
    { id: GC_LEADERBOARDS.beauty, value: Math.round(Math.max(0, ...s.tanks.map((t) => beautyScore(t)))) },
    { id: GC_LEADERBOARDS.coins, value: Math.floor(s.stats.coinsEarned) },
  ];
}

/** Kademe başına eşit pay: 4 kademeli bir başarımda 2 kademe = %50 */
export function gcAchievementPercents(s: GameState): { id: string; percent: number }[] {
  return ACHIEVEMENTS.map((a) => {
    const v = achievementValue(s, a);
    const reached = a.tiers.filter((tier) => v >= tier).length;
    return { id: gcAchievementId(a.id), percent: Math.round((reached / a.tiers.length) * 100) };
  });
}
