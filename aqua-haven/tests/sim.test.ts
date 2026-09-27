import { describe, expect, it } from 'vitest';
import { Game } from '../src/game/game';
import { createInitialState } from '../src/game/state';
import * as A from '../src/game/actions';
import { SPECIES } from '../src/data/species';
import { PLANTS } from '../src/data/plants';
import { DECOR } from '../src/data/decor';
import { xpToNext } from '../src/game/balance';
import { sellValue } from '../src/game/sim/economy';
import { checkBreeding } from '../src/game/sim/breeding';

function newGame() {
  const s = createInitialState('tr');
  return new Game(s);
}

function run(g: Game, seconds: number) {
  for (let t = 0; t < seconds; t += 0.25) g.step(0.25);
}

describe('veri bütünlüğü', () => {
  it('tür kimlikleri benzersiz ve değerler mantıklı', () => {
    const ids = new Set<string>();
    for (const sp of SPECIES) {
      expect(ids.has(sp.id)).toBe(false);
      ids.add(sp.id);
      expect(sp.temp[0]).toBeLessThan(sp.temp[1]);
      expect(sp.growTime).toBeGreaterThan(0);
      if (!sp.pearls && !sp.exclusive) expect(sp.sell).toBeGreaterThan(sp.price);
      if (sp.breed) {
        expect(sp.breed.brood[0]).toBeLessThanOrEqual(sp.breed.brood[1]);
        // üreme sıcaklığı türün yaşam aralığıyla örtüşmeli
        expect(sp.breed.temp[0]).toBeGreaterThanOrEqual(sp.temp[0] - 1);
        expect(sp.breed.temp[1]).toBeLessThanOrEqual(sp.temp[1] + 1);
      }
    }
  });

  it('bitki ve dekor kimlikleri benzersiz', () => {
    expect(new Set(PLANTS.map((p) => p.id)).size).toBe(PLANTS.length);
    expect(new Set(DECOR.map((d) => d.id)).size).toBe(DECOR.length);
  });

  it('üreme için gereken yuvalar oyunda mevcut', () => {
    const sites = new Set<string>();
    PLANTS.forEach((p) => p.sites.forEach((s) => sites.add(s)));
    DECOR.forEach((d) => d.sites?.forEach((s) => sites.add(s)));
    for (const sp of SPECIES) sp.breed?.needs.forEach((n) => expect(sites.has(n)).toBe(true));
  });
});

describe('simülasyon', () => {
  it('beslenen balık büyür ve GP kazandırır', () => {
    const g = newGame();
    const tank = g.tank;
    const fish = tank.fish[0];
    const startG = fish.g;
    for (let i = 0; i < 60; i++) {
      A.eatParticle(g, tank, fish.id, 'flakes');
      run(g, 10);
    }
    expect(fish.g).toBeGreaterThan(startG);
    expect(g.state.player.xp + (g.state.player.level - 1) * 1000).toBeGreaterThan(0);
  });

  it('aç kalan balık büyümez', () => {
    const g = newGame();
    const fish = g.tank.fish[0];
    fish.food = 0;
    const before = fish.g;
    run(g, 60);
    expect(fish.g - before).toBeLessThan(0.001);
  });

  it('kirlilik zamanla artar, su değişimi düşürür', () => {
    const g = newGame();
    const t = g.tank;
    const p0 = t.pollution;
    run(g, 600);
    expect(t.pollution).toBeGreaterThan(p0);
    const before = t.pollution;
    const r = A.waterChange(g);
    expect(r.ok).toBe(true);
    expect(t.pollution).toBeCloseTo(before * 0.5, 5);
  });

  it('yetişkin balık satılınca altın kazandırır', () => {
    const g = newGame();
    const fish = g.tank.fish[0];
    fish.g = 1;
    const coins = g.state.player.coins;
    const value = sellValue(g.state, fish);
    const r = A.sellFish(g, fish.id);
    expect(r.ok).toBe(true);
    expect(g.state.player.coins).toBe(coins + value);
    expect(g.tank.fish.find((f) => f.id === fish.id)).toBeUndefined();
  });

  it('satın alma kapasite ve seviye kontrolü yapar', () => {
    const g = newGame();
    g.state.player.coins = 100000;
    expect(A.buySpecies(g, 'discus').err).toBe('level');
    expect(A.buySpecies(g, 'clown').err).toBe('level');
    let bought = 0;
    while (A.buySpecies(g, 'zebra').ok) bought++;
    expect(bought).toBe(2); // nano: 6 kapasite - 4 (iki japon)
    expect(A.buySpecies(g, 'zebra').err).toBe('capacity');
  });

  it('seviye atlama ödül verir', () => {
    const g = newGame();
    const coins = g.state.player.coins;
    g.addXp(xpToNext(1) + 1);
    expect(g.state.player.level).toBe(2);
    expect(g.state.player.coins).toBeGreaterThan(coins);
  });

  it('günlük görevler oluşur ve ilerler', () => {
    const g = newGame();
    run(g, 1);
    expect(g.state.daily.quests.length).toBe(3);
    const q = g.state.daily.quests[0];
    g.progress(q.kind, q.target);
    expect(q.progress).toBe(q.target);
  });

  it('çevrimdışı ilerleme balıkları öldürmez', () => {
    const g = newGame();
    g.state.player.level = 10;
    g.state.lastSeen = Date.now() - 3 * 24 * 3600 * 1000;
    const n = g.tank.fish.length;
    const summary = g.catchUp();
    expect(summary).not.toBeNull();
    expect(g.tank.fish.length).toBe(n);
    for (const f of g.tank.fish) expect(f.hp).toBeGreaterThanOrEqual(25);
    expect(g.tank.pollution).toBeLessThanOrEqual(65.01);
  });

  it('üreme koşulları kontrol edilir ve yavru doğar', () => {
    const g = newGame();
    g.state.player.level = 10;
    g.state.player.coins = 1e6;
    const t = g.tank;
    t.fish = [];
    t.equip.heater = 2;
    t.targetTemp = 26;
    t.temp = 26;
    t.pollution = 0;
    A.buySpecies(g, 'guppy', 'M');
    A.buySpecies(g, 'guppy', 'F');
    for (const f of t.fish) {
      f.g = 1;
      f.joy = 90;
      f.food = 100;
    }
    const sp = SPECIES.find((s) => s.id === 'guppy')!;
    const check = checkBreeding(t, sp);
    expect(check.ok).toBe(true);
    expect(A.breed(g, 'guppy').ok).toBe(true);
    for (let i = 0; i < 40; i++) {
      for (const f of t.fish) f.food = 100;
      run(g, 10);
    }
    expect(t.fish.length).toBeGreaterThan(2);
    expect(g.state.stats.bred).toBeGreaterThan(0);
  });

  it('sürpriz yumurta açılır', () => {
    const g = newGame();
    g.state.player.level = 5;
    g.tank.fish = [];
    g.state.inv.items.mysteryEgg = 1;
    const r = A.openMysteryEgg(g);
    expect(r.ok).toBe(true);
    expect(g.tank.fish.length).toBe(1);
  });
});
