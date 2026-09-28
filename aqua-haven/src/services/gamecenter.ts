import type { Game } from '../game/game';
import { gcAchievementPercents, gcScores } from '../game/gamecenter';
import { AquaNative } from './native';
import { isIOS } from './platform';

class GameCenterService {
  readonly available = isIOS;
  authed = false;
  onChange: () => void = () => undefined;
  private game: Game | null = null;
  private sentScores: Record<string, number> = {};
  private syncing = false;

  async init(game: Game) {
    this.game = game;
    if (!this.available) return;
    AquaNative.addListener('gcAuth', (e) => {
      this.authed = e.authenticated;
      this.onChange();
      if (this.authed) this.sync();
    }).catch(() => undefined);
    await this.signIn();
    game.events.on('levelUp', () => this.sync());
    game.events.on('achievement', () => this.sync());
    setInterval(() => this.sync(), 5 * 60_000);
  }

  async signIn(): Promise<boolean> {
    if (!this.available) return false;
    try {
      this.authed = (await AquaNative.gcSignIn()).authenticated;
    } catch {
      this.authed = false;
    }
    this.onChange();
    if (this.authed) this.sync();
    return this.authed;
  }

  /** Değişen skorları ve ilerleyen başarımları gönderir */
  async sync() {
    const g = this.game;
    if (!this.authed || !g || this.syncing) return;
    this.syncing = true;
    try {
      const s = g.state;
      const scores = gcScores(s).filter((x) => x.value > 0 && x.value > (this.sentScores[x.id] ?? 0));
      if (scores.length) {
        await AquaNative.gcSubmitScores({ scores });
        for (const x of scores) this.sentScores[x.id] = x.value;
      }
      const achievements = gcAchievementPercents(s).filter((a) => a.percent > (s.flags[`gc:${a.id}`] ?? 0));
      if (achievements.length) {
        await AquaNative.gcReportAchievements({ achievements });
        for (const a of achievements) s.flags[`gc:${a.id}`] = a.percent;
      }
    } catch (e) {
      console.warn('Game Center eşitlemesi başarısız', e);
    } finally {
      this.syncing = false;
    }
  }

  async show(view: 'leaderboards' | 'achievements'): Promise<boolean> {
    if (!this.available) return false;
    if (!this.authed && !(await this.signIn())) return false;
    await this.sync();
    try {
      await AquaNative.gcShow({ view });
      return true;
    } catch {
      return false;
    }
  }
}

export const gameCenter = new GameCenterService();
