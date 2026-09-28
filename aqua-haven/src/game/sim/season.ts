import { SEASONS, getSeason, type SeasonBonus, type SeasonDef } from '../../data/seasons';
import { QUEST_TEMPLATES } from '../../data/progression';
import { levelScale } from '../balance';
import type { GameState, QuestKind } from '../types';
import type { SimHost } from './host';

const DAY = 86400000;

export interface ActiveSeason {
  def: SeasonDef;
  start: number;
  end: number;
}

let override: ActiveSeason | null = null;

/** Önizleme/test için etkinliği takvimden bağımsız başlatır */
export function setSeasonOverride(id: string | null, now = Date.now()) {
  const def = id ? getSeason(id) : undefined;
  override = def ? { def, start: now - DAY, end: now + 14 * DAY } : null;
  cacheMin = -1;
}

/** Etkinliğin `now` anını kapsayan penceresi (yoksa null) */
export function seasonWindow(def: SeasonDef, now: number): { start: number; end: number } | null {
  const y = new Date(now).getFullYear();
  for (const Y of [y - 1, y]) {
    const start = new Date(Y, def.from[0] - 1, def.from[1]).getTime();
    const wraps = def.to[0] < def.from[0];
    const end = new Date(wraps ? Y + 1 : Y, def.to[0] - 1, def.to[1] + 1).getTime();
    if (now >= start && now < end) return { start, end };
  }
  return null;
}

let cacheMin = -1;
let cached: ActiveSeason | null = null;

export function activeSeason(now = Date.now()): ActiveSeason | null {
  if (override) return override;
  const min = Math.floor(now / 60000);
  if (min === cacheMin) return cached;
  cacheMin = min;
  cached = null;
  for (const def of SEASONS) {
    const w = seasonWindow(def, now);
    if (w) {
      cached = { def, ...w };
      break;
    }
  }
  return cached;
}

export function nextSeason(now = Date.now()): ActiveSeason | null {
  let best: ActiveSeason | null = null;
  const y = new Date(now).getFullYear();
  for (const def of SEASONS) {
    for (const Y of [y, y + 1]) {
      const start = new Date(Y, def.from[0] - 1, def.from[1]).getTime();
      if (start <= now) continue;
      if (!best || start < best.start) best = { def, start, end: start };
      break;
    }
  }
  return best;
}

/** Aktif etkinliğin bu türdeki bonusu (0 = yok) */
export function seasonBonus(kind: SeasonBonus, now = Date.now()): number {
  const a = activeSeason(now);
  return a && a.def.bonus.kind === kind ? a.def.bonus.v : 0;
}

export function seasonTarget(kind: QuestKind, mult: number, level: number): number {
  const tpl = QUEST_TEMPLATES.find((q) => q.kind === kind);
  return Math.max(1, Math.round((tpl ? tpl.target(level, 2) : 5) * mult));
}

export function seasonTaskCoins(level: number, i: number): number {
  return Math.round(120 * levelScale(level) * (1 + i * 0.5));
}

/** Yeni bir etkinlik başladıysa ilerlemeyi sıfırdan kurar */
export function ensureSeason(host: SimHost, now = Date.now()): boolean {
  const a = activeSeason(now);
  if (!a) return false;
  const s = host.state;
  const key = `${a.def.id}-${new Date(a.start).getFullYear()}`;
  if (s.season?.key === key) return false;
  const lvl = s.player.level;
  s.season = {
    key,
    id: a.def.id,
    until: a.end,
    targets: a.def.tasks.map((tk) => seasonTarget(tk.kind, tk.mult, lvl)),
    progress: a.def.tasks.map(() => 0),
    claimed: a.def.tasks.map(() => false),
    done: false,
  };
  host.emit('seasonStarted', { id: a.def.id });
  return true;
}

function live(s: GameState, now = Date.now()) {
  const st = s.season;
  if (!st || st.until <= now) return null;
  const def = getSeason(st.id);
  return def ? { st, def } : null;
}

export function progressSeason(host: SimHost, kind: QuestKind, amount: number) {
  const l = live(host.state);
  if (!l) return;
  l.def.tasks.forEach((tk, i) => {
    if (tk.kind !== kind || l.st.progress[i] >= l.st.targets[i]) return;
    l.st.progress[i] = Math.min(l.st.targets[i], l.st.progress[i] + amount);
    if (l.st.progress[i] >= l.st.targets[i]) host.emit('questComplete', { id: `season:${i}` });
  });
}

export function claimSeasonTask(host: SimHost, i: number): boolean {
  const l = live(host.state);
  if (!l || l.st.claimed[i] || l.st.progress[i] < l.st.targets[i]) return false;
  l.st.claimed[i] = true;
  host.addCoins(seasonTaskCoins(host.state.player.level, i));
  host.addPearls(l.def.tasks[i].pearls);
  return true;
}

export function claimSeasonReward(host: SimHost): boolean {
  const l = live(host.state);
  if (!l || l.st.done || !l.st.claimed.every(Boolean)) return false;
  l.st.done = true;
  const inv = host.state.inv.decor;
  inv[l.def.reward] = (inv[l.def.reward] ?? 0) + 1;
  host.addPearls(l.def.rewardPearls);
  return true;
}

export function seasonClaimable(s: GameState): number {
  const l = live(s);
  if (!l) return 0;
  let n = l.st.claimed.filter((c, i) => !c && l.st.progress[i] >= l.st.targets[i]).length;
  if (!l.st.done && l.st.claimed.every(Boolean)) n++;
  return n;
}

/** Etkinlik dekoru şu an satın alınabilir mi */
export function seasonDecorOnSale(season: string | undefined, now = Date.now()): boolean {
  if (!season) return true;
  return activeSeason(now)?.def.id === season;
}
