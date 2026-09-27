import { BAL, MAX_LEVEL, levelRewards, xpToNext } from './balance';
import { Emitter, type GameEvents } from './events';
import { activeTank } from './state';
import type { GameState, Lang, QuestKind, TankState } from './types';
import type { SimHost } from './sim/host';
import { updateTank } from './sim/tank';
import { ensureDaily, notifyAchievements, progressQuests } from './sim/quests';
import { resolveLang } from '../i18n/lang';

export const SIM_STEP = 0.25;

export interface OfflineSummary {
  seconds: number;
  tips: number;
  grown: number;
  bred: number;
  sick: number;
  hungry: number;
  dirty: boolean;
  algae: boolean;
}

/** Oyun çekirdeği: durum + simülasyon döngüsü + para/GP işlemleri */
export class Game implements SimHost {
  state: GameState;
  events = new Emitter<GameEvents>();
  offline = false;
  sessionSec = 0;
  private acc = 0;
  private achTimer = 0;

  constructor(state: GameState) {
    this.state = state;
  }

  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]) {
    this.events.emit(type, payload);
  }

  lang(): Lang {
    return resolveLang(this.state.settings.lang);
  }

  activeTankId(): string | null {
    return this.offline ? null : activeTank(this.state).id;
  }

  get tank(): TankState {
    return activeTank(this.state);
  }

  // ------------------------------------------------------------ para ve GP

  addXp(amount: number, fishId?: string) {
    const s = this.state;
    if (!(amount > 0) || s.player.level >= MAX_LEVEL) return;
    s.player.xp += amount;
    this.emit('xp', { amount, fishId });
    while (s.player.level < MAX_LEVEL && s.player.xp >= xpToNext(s.player.level)) {
      s.player.xp -= xpToNext(s.player.level);
      s.player.level++;
      const r = levelRewards(s.player.level);
      s.player.coins += r.coins;
      s.player.pearls += r.pearls;
      this.emit('levelUp', { level: s.player.level, coins: r.coins, pearls: r.pearls });
    }
    if (s.player.level >= MAX_LEVEL) s.player.xp = 0;
  }

  addCoins(amount: number, earned = false) {
    if (!amount) return;
    this.state.player.coins += amount;
    if (earned && amount > 0) this.state.stats.coinsEarned += amount;
    this.emit('coins', { amount });
  }

  addPearls(amount: number) {
    if (!amount) return;
    this.state.player.pearls += amount;
    this.emit('pearls', { amount });
  }

  canAfford(coins = 0, pearls = 0): boolean {
    return this.state.player.coins >= coins && this.state.player.pearls >= pearls;
  }

  /** Harcama yapar; yetmezse hiçbir şey düşmez */
  spend(coins = 0, pearls = 0): boolean {
    if (!this.canAfford(coins, pearls)) return false;
    if (coins) this.addCoins(-coins);
    if (pearls) this.addPearls(-pearls);
    return true;
  }

  progress(kind: QuestKind, amount = 1) {
    progressQuests(this, kind, amount);
  }

  // ------------------------------------------------------------ döngü

  /** Gerçek zamanlı güncelleme (saniye) */
  update(dt: number) {
    this.sessionSec += dt;
    this.state.playTime += dt;
    this.acc += dt;
    let n = 0;
    while (this.acc >= SIM_STEP && n < 40) {
      this.acc -= SIM_STEP;
      this.step(SIM_STEP);
      n++;
    }
    if (n >= 40) this.acc = 0;
    this.state.lastSeen = Date.now();
  }

  step(dt: number) {
    ensureDaily(this);
    for (const t of this.state.tanks) updateTank(this, t, dt);
    this.achTimer += dt;
    if (this.achTimer > 2) {
      this.achTimer = 0;
      notifyAchievements(this);
    }
  }

  /** Uygulama kapalıyken geçen süreyi simüle eder */
  catchUp(now = Date.now()): OfflineSummary | null {
    const s = this.state;
    let seconds = (now - s.lastSeen) / 1000;
    if (!(seconds > 20)) {
      s.lastSeen = now;
      return null;
    }
    seconds = Math.min(seconds, BAL.OFFLINE_MAX_SEC);
    const tipsBefore = s.tanks.reduce((a, t) => a + t.tips, 0);
    const summary: OfflineSummary = { seconds, tips: 0, grown: 0, bred: 0, sick: 0, hungry: 0, dirty: false, algae: false };
    const offs = [
      this.events.on('fishAdult', () => summary.grown++),
      this.events.on('bred', (e) => (summary.bred += e.count)),
      this.events.on('fishSick', () => summary.sick++),
    ];
    this.offline = true;
    try {
      const step = seconds <= 3600 ? 5 : Math.min(60, Math.max(5, seconds / 2500));
      let left = seconds;
      while (left > 0) {
        const dt = Math.min(step, left);
        for (const t of s.tanks) updateTank(this, t, dt);
        left -= dt;
      }
    } finally {
      this.offline = false;
      offs.forEach((off) => off());
    }
    ensureDaily(this, now);
    s.lastSeen = now;
    summary.tips = Math.max(0, s.tanks.reduce((a, t) => a + t.tips, 0) - tipsBefore);
    for (const t of s.tanks) {
      summary.hungry += t.fish.filter((f) => f.food < 25).length;
      if (t.pollution > 40 || t.dirt > 50) summary.dirty = true;
      if (t.algae.reduce((a, b) => a + b, 0) / t.algae.length > 0.35) summary.algae = true;
    }
    return summary;
  }
}
