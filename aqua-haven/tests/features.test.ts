import { afterEach, describe, expect, it } from 'vitest';
import { Game } from '../src/game/game';
import { createInitialState } from '../src/game/state';
import * as A from '../src/game/actions';
import { SEASONS, getSeason } from '../src/data/seasons';
import { DECOR, getDecor } from '../src/data/decor';
import { getSpecies } from '../src/data/species';
import { ACHIEVEMENTS } from '../src/data/progression';
import { gcAchievementPercents, gcScores } from '../src/game/gamecenter';
import { sellValue } from '../src/game/sim/economy';
import { growthRate } from '../src/game/sim/fish';
import {
  activeSeason, claimSeasonReward, claimSeasonTask, ensureSeason, nextSeason, seasonBonus, seasonWindow, setSeasonOverride,
} from '../src/game/sim/season';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

afterEach(() => setSeasonOverride(null));

describe('sezon etkinlikleri', () => {
  it('takvim pencereleri doğru (yılbaşı geçişi dahil)', () => {
    const winter = getSeason('winter')!;
    expect(seasonWindow(winter, at(2026, 12, 9))).toBeNull();
    expect(seasonWindow(winter, at(2026, 12, 10, 0))).not.toBeNull();
    expect(seasonWindow(winter, at(2027, 1, 10, 23))).not.toBeNull();
    expect(seasonWindow(winter, at(2027, 1, 11))).toBeNull();
    expect(activeSeason(at(2026, 10, 20))?.def.id).toBe('halloween');
    expect(activeSeason(at(2026, 9, 28))).toBeNull();
    expect(nextSeason(at(2026, 9, 28))?.def.id).toBe('halloween');
    expect(nextSeason(at(2026, 12, 31))?.def.id).toBe('spring');
  });

  it('etkinlikler çakışmaz ve verileri tutarlı', () => {
    for (let d = 0; d < 366; d++) {
      const now = at(2026, 1, 1) + d * 86400000;
      expect(SEASONS.filter((x) => seasonWindow(x, now)).length).toBeLessThanOrEqual(1);
    }
    for (const x of SEASONS) {
      expect(getDecor(x.reward).exclusive).toBe('season');
      for (const id of x.decor) expect(getDecor(id).season).toBe(x.id);
      for (const f of x.fish) {
        const v = getSpecies(f.sp).variants?.find((y) => y.id === f.variant);
        expect(v?.w).toBe(0);
      }
    }
    expect(new Set(DECOR.map((d) => d.id)).size).toBe(DECOR.length);
  });

  it('görevler ilerler, ödüller bir kez alınır', () => {
    setSeasonOverride('halloween');
    const g = new Game(createInitialState('tr'));
    expect(ensureSeason(g)).toBe(true);
    expect(ensureSeason(g)).toBe(false);
    const st = g.state.season!;
    expect(st.id).toBe('halloween');
    expect(claimSeasonTask(g, 0)).toBe(false);
    for (let i = 0; i < st.targets.length; i++) g.progress(getSeason('halloween')!.tasks[i].kind, st.targets[i]);
    const pearls = g.state.player.pearls;
    for (let i = 0; i < st.targets.length; i++) expect(claimSeasonTask(g, i)).toBe(true);
    expect(claimSeasonTask(g, 0)).toBe(false);
    expect(g.state.player.pearls).toBeGreaterThan(pearls);
    expect(claimSeasonReward(g)).toBe(true);
    expect(claimSeasonReward(g)).toBe(false);
    expect(g.state.inv.decor.cauldron).toBe(1);
  });

  it('bonuslar yalnızca etkinlikte uygulanır ve etkinlik ürünleri sonra satılmaz', () => {
    const g = new Game(createInitialState('tr'));
    g.state.player.coins = 1e6;
    g.state.player.level = 10;
    const fish = g.state.tanks[0].fish[0];
    const base = growthRate(fish, getSpecies(fish.sp), g.state.tanks[0]);
    const sell = sellValue(g.state, fish);
    expect(A.buyDecor(g, 'pumpkin').err).toBe('ended');
    expect(A.buySeasonFish(g, 'betta', 'pumpkin').err).toBe('ended');

    setSeasonOverride('spring');
    expect(seasonBonus('growth')).toBe(0.25);
    expect(growthRate(fish, getSpecies(fish.sp), g.state.tanks[0])).toBeCloseTo(base * 1.25);
    expect(A.buyDecor(g, 'flowerPot').ok).toBe(true);
    expect(A.buyDecor(g, 'pagoda').err).toBe('exclusive');
    const r = A.buySeasonFish(g, 'goldfish', 'sakura');
    expect(r.ok).toBe(true);
    expect(r.value?.var).toBe('sakura');

    setSeasonOverride('winter');
    expect(Math.abs(sellValue(g.state, fish) - sell * 1.25)).toBeLessThanOrEqual(1);
  });

  it('etkinlik renkleri rastgele mutasyonla çıkmaz', () => {
    for (const x of SEASONS) {
      for (const f of x.fish) expect(getSpecies(f.sp).variants!.find((v) => v.id === f.variant)!.w).toBe(0);
    }
  });
});

describe('fotoğraf görevi ve Game Center', () => {
  it('fotoğraf görevi günlük görev olarak ilerler', () => {
    const g = new Game(createInitialState('tr'));
    g.step(0.25);
    g.state.daily.quests[0] = { ...g.state.daily.quests[0], kind: 'photo', target: 1, progress: 0, claimed: false };
    g.progress('photo', 1);
    expect(g.state.daily.quests[0].progress).toBe(1);
  });

  it('başarım yüzdeleri kademelere göre hesaplanır', () => {
    const s = createInitialState('tr');
    const feeder = ACHIEVEMENTS.find((a) => a.id === 'feeder')!;
    s.stats.fed = feeder.tiers[1];
    const p = gcAchievementPercents(s).find((x) => x.id === 'aquahaven.ach.feeder')!;
    expect(p.percent).toBe(Math.round((2 / feeder.tiers.length) * 100));
    expect(gcAchievementPercents(s)).toHaveLength(ACHIEVEMENTS.length);
    const scores = gcScores(s);
    expect(scores.map((x) => x.id)).toEqual(['aquahaven.lb.level', 'aquahaven.lb.beauty', 'aquahaven.lb.coins']);
    expect(scores[0].value).toBe(1);
  });
});
