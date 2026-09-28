import { ACHIEVEMENTS, QUEST_TEMPLATES, loginRewardFor, type AchievementDef, type LoginReward } from '../../data/progression';
import { SPECIES } from '../../data/species';
import { levelScale, xpToNext } from '../balance';
import type { GameState, QuestKind, QuestState } from '../types';
import { dayDiff, dayKey, hashString, mulberry32, weightedPick } from '../util';
import type { SimHost } from './host';
import { ensureSeason, progressSeason, seasonClaimable } from './season';

function questAllowed(s: GameState, kind: QuestKind): boolean {
  const lvl = s.player.level;
  switch (kind) {
    case 'breed':
      return lvl >= 5;
    case 'trim':
      return s.tanks.some((t) => t.plants.length > 0);
    case 'lucky':
      return s.tanks.some((t) => t.fish.some((f) => SPECIES.find((x) => x.id === f.sp)?.traits.some((tr) => tr.id === 'lucky')));
    default:
      return true;
  }
}

export function makeQuest(s: GameState, rng: () => number, diff: number, exclude: QuestKind[]): QuestState {
  const lvl = s.player.level;
  const pool = QUEST_TEMPLATES.filter((q) => q.minLevel <= lvl && !exclude.includes(q.kind) && questAllowed(s, q.kind));
  const tpl = weightedPick(pool.length ? pool : QUEST_TEMPLATES.slice(0, 1), (q) => q.weight, rng);
  const target = tpl.target(lvl, diff);
  return {
    id: `q${Math.floor(rng() * 1e9).toString(36)}`,
    kind: tpl.kind,
    target,
    progress: 0,
    coins: Math.round((40 + 25 * lvl) * (1 + diff * 0.6)),
    xp: Math.round(xpToNext(lvl) * (0.04 + 0.02 * diff)),
    pearls: diff === 2 ? 2 : diff === 1 ? 1 : 0,
    claimed: false,
  };
}

function pickHot(s: GameState, rng: () => number): string[] {
  const pool = SPECIES.filter((sp) => sp.level <= Math.max(2, s.player.level) && !sp.pearls && !sp.exclusive);
  const out: string[] = [];
  while (out.length < 2 && pool.length) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool[i].id);
    pool.splice(i, 1);
  }
  return out;
}

/** Gün değiştiyse günlük görevleri, pazarı ve giriş serisini yeniler */
export function ensureDaily(host: SimHost, now = Date.now()): boolean {
  const s = host.state;
  ensureSeason(host, now);
  const today = dayKey(now);
  if (s.daily.day === today) return false;
  const rng = mulberry32(hashString(today) ^ s.seed);
  const quests: QuestState[] = [];
  for (let d = 0; d < 3; d++) quests.push(makeQuest(s, rng, d, quests.map((q) => q.kind)));

  // Giriş serisi: bir gün kaçırmak affedilir, daha fazlası seriyi sıfırlar
  const last = s.daily.lastLoginDay;
  const gap = last ? dayDiff(last, today) : 1;
  let streak = s.daily.loginStreak;
  if (!s.daily.day) streak = 0; // ilk açılış
  streak = gap <= 2 ? (streak % 7) + 1 : 1;

  s.daily = {
    day: today,
    quests,
    bonusClaimed: false,
    rerolls: 0,
    ads: {},
    hot: pickHot(s, rng),
    loginStreak: streak,
    loginClaimed: false,
    lastLoginDay: today,
    vipClaimed: false,
  };
  host.emit('dayChanged', { day: today });
  return true;
}

export function progressQuests(host: SimHost, kind: QuestKind, amount = 1) {
  progressSeason(host, kind, amount);
  for (const q of host.state.daily.quests) {
    if (q.kind !== kind || q.claimed || q.progress >= q.target) continue;
    q.progress = Math.min(q.target, q.progress + amount);
    if (q.progress >= q.target) host.emit('questComplete', { id: q.id });
  }
}

export function claimQuest(host: SimHost, id: string, double = false): boolean {
  const q = host.state.daily.quests.find((x) => x.id === id);
  if (!q || q.claimed || q.progress < q.target) return false;
  q.claimed = true;
  const m = double ? 2 : 1;
  host.addCoins(q.coins * m);
  host.addXp(q.xp * m);
  if (q.pearls) host.addPearls(q.pearls * m);
  host.state.stats.questsDone++;
  return true;
}

export function bonusReward(s: GameState) {
  return { coins: Math.round(150 * levelScale(s.player.level)), pearls: 5 };
}

export function claimBonus(host: SimHost): boolean {
  const d = host.state.daily;
  if (d.bonusClaimed || !d.quests.every((q) => q.claimed)) return false;
  d.bonusClaimed = true;
  const r = bonusReward(host.state);
  host.addCoins(r.coins);
  host.addPearls(r.pearls);
  return true;
}

export function rerollQuest(host: SimHost, id: string): boolean {
  const d = host.state.daily;
  const i = d.quests.findIndex((q) => q.id === id);
  if (i < 0 || d.quests[i].claimed) return false;
  const rng = mulberry32(Math.floor(Math.random() * 1e9));
  d.quests[i] = makeQuest(host.state, rng, i, d.quests.map((q) => q.kind));
  d.rerolls++;
  return true;
}

export function todaysLoginReward(s: GameState): LoginReward {
  return loginRewardFor(Math.max(1, s.daily.loginStreak), levelScale(s.player.level));
}

// ---------------------------------------------------------------- Başarımlar

export function achievementValue(s: GameState, a: AchievementDef): number {
  if (a.stat === 'level') return s.player.level;
  if (a.stat === 'species') return Object.keys(s.discovered).filter((k) => !k.includes(':')).length;
  return s.stats[a.stat] ?? 0;
}

export function achievementStatus(s: GameState, a: AchievementDef) {
  const claimed = s.achievements[a.id] ?? 0;
  const value = achievementValue(s, a);
  const done = claimed >= a.tiers.length;
  const next = done ? a.tiers[a.tiers.length - 1] : a.tiers[claimed];
  return { claimed, value, next, done, claimable: !done && value >= next, pearls: done ? 0 : a.pearls[claimed] };
}

export function claimAchievement(host: SimHost, id: string): boolean {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) return false;
  const st = achievementStatus(host.state, a);
  if (!st.claimable) return false;
  host.state.achievements[a.id] = st.claimed + 1;
  host.addPearls(st.pearls);
  return true;
}

export function claimableCount(s: GameState): number {
  let n = s.daily.quests.filter((q) => !q.claimed && q.progress >= q.target).length;
  if (!s.daily.bonusClaimed && s.daily.quests.length && s.daily.quests.every((q) => q.claimed)) n++;
  if (!s.daily.loginClaimed) n++;
  n += ACHIEVEMENTS.filter((a) => achievementStatus(s, a).claimable).length;
  return n + seasonClaimable(s);
}

/** Yeni tamamlanan başarımlar için bir kez bildirim gönderir */
export function notifyAchievements(host: SimHost) {
  const s = host.state;
  for (const a of ACHIEVEMENTS) {
    const st = achievementStatus(s, a);
    const key = `ach:${a.id}`;
    if (st.claimable && (s.flags[key] ?? -1) < st.claimed) {
      s.flags[key] = st.claimed;
      host.emit('achievement', { id: a.id, tier: st.claimed });
    }
  }
}
