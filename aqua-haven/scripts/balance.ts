// Denge simülasyonu: basit bir "bot oyuncu" oyunu arayüzsüz oynar ve ilerlemeyi raporlar.
// Kullanım: npm run balance [-- --hours 40 --session 20 --gap 180]
import { Game } from '../src/game/game';
import { createInitialState, capacityFree } from '../src/game/state';
import * as A from '../src/game/actions';
import { SPECIES } from '../src/data/species';
import { EQUIPMENT } from '../src/data/equipment';
import { getTankType } from '../src/data/tanks';
import { claimQuest, claimBonus } from '../src/game/sim/quests';
import { xpToNext } from '../src/game/balance';
import type { SpeciesDef } from '../src/game/types';

const args = process.argv.slice(2);
const arg = (k: string, d: number) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const HOURS = arg('hours', 40); // toplam aktif oyun saati
const SESSION = arg('session', 20); // oturum süresi (dk)
const GAP = arg('gap', 180); // oturumlar arası çevrimdışı süre (dk)
const FEED = arg('feed', 2); // kaç dakikada bir besler

const g = new Game(createInitialState('tr'));
g.state.tutorial.done = true;
let clock = Date.now();
let active = 0;
const reached: Record<number, { h: number; days: number; coins: number; tier: number; fish: number }> = {};
const start = clock;

function profitScore(sp: SpeciesDef) {
  return (sp.sell - sp.price) / sp.bioload / (sp.growTime / 60 + 2);
}

function feedAll() {
  const s = g.state;
  const tank = g.tank;
  for (const f of tank.fish) {
    let guard = 0;
    while (f.food < 88 && guard++ < 12) {
      if (!A.dropFood(g).ok) {
        if (!A.buyFood(g, 'flakes').ok) return;
        continue;
      }
      for (let i = 0; i < 3 && f.food < 100; i++) A.eatParticle(g, tank, f.id, s.selectedFood);
    }
  }
}

function manage() {
  const s = g.state;
  const tank = g.tank;
  // yetişkinleri sat
  for (const f of tank.fish.filter((x) => x.g >= 1)) A.sellFish(g, f.id);
  // su bakımı
  if (tank.pollution > 40) A.waterChange(g);
  for (let i = 0; i < tank.algae.length; i++) if (tank.algae[i] > 0.3) A.wipeAlgae(g, tank, i, 1);
  if (tank.dirt > 30) A.vacuumDirt(g, tank, tank.dirt);
  A.collectTips(g);
  for (const q of s.daily.quests) claimQuest(g, q.id);
  claimBonus(g);
  // ekipman (ucuzsa)
  for (const slot of ['filter', 'air', 'heater', 'feeder'] as const) {
    const next = EQUIPMENT.filter((e) => e.slot === slot && e.tier > (tank.equip[slot] ?? 0) && e.level <= s.player.level).sort((a, b) => a.tier - b.tier)[0];
    if (next && next.price < s.player.coins * 0.25) A.buyEquipment(g, slot, next.tier);
  }
  if (tank.equip.heater && tank.targetTemp < 25) A.setTargetTemp(tank, 25);
  // tank büyütme
  const nextTier = getTankType(tank.type).tiers[tank.tier + 1];
  if (nextTier && nextTier.level <= s.player.level && s.player.coins > nextTier.price * 1.1) A.upgradeTank(g);
  // yeni canlı al (en kârlı, uygun, bütçenin %60'ı)
  let guard = 0;
  while (guard++ < 30) {
    const options = SPECIES.filter((sp) => !sp.exclusive && !sp.pearls && sp.water === tank.type && sp.level <= s.player.level &&
      (sp.minTier ?? 0) <= tank.tier && sp.bioload <= capacityFree(tank) && sp.price <= s.player.coins * 0.6 &&
      sp.temp[0] <= tank.temp && sp.temp[1] >= tank.temp).sort((a, b) => profitScore(b) - profitScore(a));
    const sp = options[0];
    if (!sp) break;
    if (!A.buySpecies(g, sp.id).ok) break;
  }
  if ((s.inv.food.flakes ?? 0) < 20) A.buyFood(g, 'flakes', 2);
}

function record() {
  const s = g.state;
  for (let l = 2; l <= s.player.level; l++) {
    if (!reached[l]) {
      reached[l] = { h: active / 3600, days: (clock - start) / 86400000, coins: s.player.coins, tier: g.tank.tier, fish: g.tank.fish.length };
    }
  }
}

while (active < HOURS * 3600) {
  // aktif oturum: her 30 sn yönet, her 10 dk'da besle
  for (let t = 0; t < SESSION * 60; t += 30) {
    if (t % (FEED * 60) === 0) feedAll();
    if (t % 60 === 0) manage();
    for (let k = 0; k < 120; k++) g.step(0.25);
    active += 30;
    clock += 30000;
    g.state.lastSeen = clock;
    record();
  }
  // çevrimdışı ara
  clock += GAP * 60000;
  g.catchUp(clock);
  record();
}

const s = g.state;
console.log(`\nAktif oyun: ${HOURS} saat (oturum ${SESSION} dk, ara ${GAP} dk)`);
console.log('Sv  | Aktif saat | Gün  | Altın     | Tank | Canlı');
for (const [l, r] of Object.entries(reached)) {
  console.log(`${l.padStart(3)} | ${r.h.toFixed(2).padStart(10)} | ${r.days.toFixed(1).padStart(4)} | ${String(Math.round(r.coins)).padStart(9)} | ${String(r.tier).padStart(4)} | ${r.fish}`);
}
console.log(`\nSon durum: Sv ${s.player.level} (${Math.round(s.player.xp)}/${xpToNext(s.player.level)} GP), ${Math.round(s.player.coins)} altın, ${s.player.pearls} inci, tank ${g.tank.tier}, ${g.tank.fish.length} canlı`);
console.log(`Satılan: ${s.stats.sold}, büyüyen: ${s.stats.grown}, kazanılan: ${Math.round(s.stats.coinsEarned)}`);
