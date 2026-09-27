import { createFish, createInitialState, createTank } from '../game/state';
import type { GameState, Lang, TankState } from '../game/types';
import { uid } from '../game/util';

// Geliştirme ve mağaza ekran görüntüleri için hazır sahneler (?demo=fresh|marine|nano)

function addFish(s: GameState, t: TankState, lang: Lang, sp: string, n: number, g = 1, variant?: string) {
  for (let i = 0; i < n; i++) {
    const f = createFish(s, sp, lang, { g: Math.max(0.05, g - Math.random() * 0.15), variant, sex: i % 2 ? 'F' : 'M' });
    f.food = 80;
    f.joy = 85;
    t.fish.push(f);
  }
}

function plant(s: GameState, t: TankState, def: string, x: number, z: number, g = 0.92) {
  t.plants.push({ id: uid(s, 'p'), def, x, z, g });
}

function decor(s: GameState, t: TankState, def: string, x: number, z: number, flip = false) {
  t.decor.push({ id: uid(s, 'd'), def, x, z, flip });
}

export function demoState(kind: string, lang: Lang): GameState {
  const s = createInitialState(lang);
  s.tutorial.done = true;
  if (kind === 'nano') return s;
  s.player.level = 24;
  s.player.coins = 184250;
  s.player.pearls = 320;
  s.player.xp = 4200;
  const fresh = s.tanks[0];
  fresh.fish = [];
  fresh.plants = [];
  fresh.decor = [];
  fresh.algae.fill(0);
  fresh.tier = 3;
  fresh.equip = { filter: 3, heater: 2, air: 2, light: 3, feeder: 1 };
  fresh.targetTemp = 26;
  fresh.temp = 26;
  fresh.pollution = 8;
  fresh.dirt = 4;
  fresh.oxygen = 85;
  fresh.background = 'deepBlue';
  fresh.substrate = 'sand';
  plant(s, fresh, 'vallis', 8, 0.05);
  plant(s, fresh, 'vallis', 16, 0.1);
  plant(s, fresh, 'ludwigia', 25, 0.15);
  plant(s, fresh, 'sword', 40, 0.35);
  plant(s, fresh, 'rotala', 90, 0.1);
  plant(s, fresh, 'vallis', 100, 0.05);
  plant(s, fresh, 'anubias', 70, 0.7);
  plant(s, fresh, 'javaFern', 55, 0.85);
  plant(s, fresh, 'javaMoss', 83, 0.9);
  plant(s, fresh, 'lotus', 62, 0.2);
  plant(s, fresh, 'frogbit', 30, 0.5);
  plant(s, fresh, 'frogbit', 78, 0.5);
  plant(s, fresh, 'carpet', 20, 0.95);
  decor(s, fresh, 'driftwood', 50, 0.3);
  decor(s, fresh, 'castle', 96, 0.45);
  decor(s, fresh, 'chest', 30, 0.8);
  decor(s, fresh, 'slate', 12, 0.6);
  decor(s, fresh, 'rockpile', 75, 0.55);
  decor(s, fresh, 'pebbles', 45, 0.95);
  addFish(s, fresh, lang, 'neon', 7);
  addFish(s, fresh, lang, 'cardinal', 5);
  addFish(s, fresh, lang, 'angel', 2);
  addFish(s, fresh, lang, 'discus', 2);
  addFish(s, fresh, lang, 'discus', 1, 1, 'pigeon');
  addFish(s, fresh, lang, 'betta', 1, 1, 'galaxy');
  addFish(s, fresh, lang, 'rainbow', 3);
  addFish(s, fresh, lang, 'ram', 2);
  addFish(s, fresh, lang, 'cory', 3);
  addFish(s, fresh, lang, 'cherryShrimp', 3);
  addFish(s, fresh, lang, 'mysterySnail', 1);
  addFish(s, fresh, lang, 'gourami', 1);
  addFish(s, fresh, lang, 'guppy', 2, 1, 'cobra');

  const marine = createTank(s, 'marine');
  marine.tier = 1;
  marine.equip = { filter: 4, heater: 3, air: 3, light: 4, uv: 1 };
  marine.algae.fill(0);
  marine.pollution = 5;
  marine.dirt = 2;
  marine.oxygen = 90;
  plant(s, marine, 'anemone', 34, 0.55);
  plant(s, marine, 'brain', 60, 0.8);
  plant(s, marine, 'acropora', 95, 0.35);
  plant(s, marine, 'seafan', 118, 0.15);
  plant(s, marine, 'zoa', 76, 0.9);
  plant(s, marine, 'mushroom', 14, 0.85);
  plant(s, marine, 'seagrass', 128, 0.4);
  plant(s, marine, 'caulerpa', 50, 0.1);
  decor(s, marine, 'arch', 70, 0.25);
  decor(s, marine, 'liverock', 20, 0.4);
  decor(s, marine, 'liverock', 108, 0.6, true);
  addFish(s, marine, lang, 'clown', 2);
  addFish(s, marine, lang, 'clown', 1, 1, 'snowflake');
  addFish(s, marine, lang, 'bluetang', 2);
  addFish(s, marine, lang, 'yellowtang', 2);
  addFish(s, marine, lang, 'mandarin', 1);
  addFish(s, marine, lang, 'gramma', 2);
  addFish(s, marine, lang, 'emperor', 1);
  addFish(s, marine, lang, 'seahorse', 2);
  addFish(s, marine, lang, 'moonJelly', 2);
  addFish(s, marine, lang, 'cleanerShrimp', 2);
  addFish(s, marine, lang, 'starfish', 1);
  addFish(s, marine, lang, 'hermit', 1);
  addFish(s, marine, lang, 'lionfish', 1);
  addFish(s, marine, lang, 'puffer', 1);
  s.tanks.push(marine);
  s.active = kind === 'marine' ? 1 : 0;
  for (const t of s.tanks) for (const f of t.fish) s.discovered[f.sp] = Date.now();
  return s;
}
