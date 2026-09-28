import { render } from 'preact';
import { App as CapApp } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import './ui/styles.css';
import { Game } from './game/game';
import { migrate } from './game/state';
import { loadSave, writeSave } from './game/save';
import { World } from './render/world';
import { Scene } from './render/scene';
import { attachInput } from './render/input';
import { App } from './ui/App';
import { bindUI, setUI, toast, ui, refresh, act } from './ui/store';
import { setLang, t, tx } from './i18n';
import { deviceLang } from './i18n/lang';
import { audio } from './services/audio';
import { haptic, setHapticsEnabled } from './services/haptics';
import { ads, setAttPrePrompt, setMockAdUI } from './services/ads';
import { iap } from './services/iap';
import { cancelNotifications, scheduleNotifications } from './services/notify';
import { isNative } from './services/platform';
import { getSpecies } from './data/species';
import { demoState } from './dev/demo';
import { fmt } from './game/util';
import { setSeasonOverride } from './game/sim/season';
import { getSeason } from './data/seasons';
import { gameCenter } from './services/gamecenter';

async function boot() {
  const params = new URLSearchParams(location.search);
  // #demo-fresh / #event-halloween gibi çapalar da kabul edilir: sorgu dizesi taşınmayan barındırmalar için
  const demo = params.get('demo') ?? location.hash.match(/demo-(fresh|marine|nano)/)?.[1] ?? null;
  const eventOverride = params.get('event') ?? location.hash.match(/event-(spring|summer|halloween|winter)/)?.[1] ?? null;
  if (eventOverride) setSeasonOverride(eventOverride);
  const raw = demo ? null : await loadSave();
  const state = demo ? demoState(demo, deviceLang()) : migrate(raw, deviceLang());
  const game = new Game(state);
  setLang(game.lang());
  setHapticsEnabled(state.settings.haptics);
  audio.musicOn = state.settings.music;
  audio.sfxOn = state.settings.sfx;

  const summary = raw ? game.catchUp() : null;
  const world = new World(game);
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const scene = new Scene(canvas, game, world);
  scene.quality = state.settings.quality;
  bindUI(game, scene, world);

  const safeInsets = () => {
    const cs = getComputedStyle(document.documentElement);
    return { left: parseFloat(cs.getPropertyValue('--sal')) || 0, right: parseFloat(cs.getPropertyValue('--sar')) || 0 };
  };
  const resize = () => {
    const ins = safeInsets();
    scene.safe = { left: 66 + ins.left, right: 66 + ins.right };
    scene.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  };
  resize();
  window.addEventListener('resize', resize);

  // Olaylar → bildirim, ses, titreşim
  const ev = game.events;
  const onActive = (tankId: string) => tankId === game.tank.id;
  ev.on('levelUp', (e) => {
    audio.play('levelUp');
    haptic.success();
    setUI({ levelUp: e });
  });
  ev.on('fishAdult', (e) => onActive(e.tankId) && toast(t('ev.adult', { name: e.fish.name }), 'good'));
  ev.on('fishDied', (e) => {
    toast(t('ev.died', { name: e.fish.name }), 'bad');
    if (ui.selectedFish === e.fish.id) setUI({ selectedFish: null });
  });
  ev.on('fishSick', (e) => toast(t('ev.sick', { name: e.fish.name }), 'warn'));
  ev.on('bred', (e) => {
    audio.play('heart');
    toast(t('ev.bred', { n: e.count }), 'good');
    for (const v of e.mutations) {
      const name = tx(getSpecies(e.sp).variants?.find((x) => x.id === v)?.name);
      toast(t('ev.mutation', { v: name }), 'good');
    }
  });
  ev.on('pearlMade', () => toast(t('ev.pearl'), 'good'));
  ev.on('questComplete', () => {
    audio.play('success');
    toast(t('q.complete'), 'good');
  });
  let achT = 0;
  ev.on('achievement', () => {
    if (performance.now() - achT < 8000) return;
    achT = performance.now();
    toast(t('q.achUnlocked'), 'good');
  });
  ev.on('luckyCaught', () => audio.play('lucky'));
  ev.on('dayChanged', () => refresh());
  ev.on('seasonStarted', (e) => {
    const d = getSeason(e.id);
    if (d) toast(t('season.started', { name: `${d.icon} ${tx(d.name)}` }), 'good');
    refresh();
  });
  world.onFx = (k) => {
    if (k === 'eat') audio.play('eat');
    else if (k === 'splash') audio.play('splash');
    else if (k === 'pop') audio.play('bubble');
    else if (k === 'lucky') audio.play('lucky');
    else if (k === 'suck') audio.play('suck');
  };
  let o2Warned = 0;

  attachInput(canvas, scene, game, {
    onSelectFish: (id) => !ui.photo && setUI({ selectedFish: id }),
    onSelectDecor: (id) => setUI({ decorSel: id }),
    onTap: () => audio.unlock(),
    onResult: (r, kind) => {
      if (!r.ok) {
        act(r);
        if (kind === 'food') setUI({ panel: 'shop', panelTab: 'care' });
        return;
      }
      if (kind === 'trim') toast(t('ev.trim', { c: fmt((r.value as number) ?? 0) }), 'good');
      if (kind === 'pearl') audio.play('pearl');
      audio.play('coin');
    },
    onFx: (k) => {
      if (k === 'plop') audio.play('plop');
      else if (k === 'wipe') audio.play('wipe');
      else if (k === 'lucky') audio.play('coin');
    },
  });

  // Reklam taklidi ve ATT açıklaması
  setMockAdUI((kind) => new Promise((resolve) => setUI({ mockAd: { kind, resolve } })));
  setAttPrePrompt(() => new Promise((resolve) => setUI({ att: { resolve } })));

  render(<App />, document.getElementById('app')!);

  // Döngü
  let last = performance.now();
  let saveT = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    game.update(dt);
    world.update(dt);
    scene.render(dt);
    saveT += dt;
    if (saveT > 10) {
      saveT = 0;
      if (!demo) writeSave(game.state);
      if (game.tank.oxygen < 25 && performance.now() - o2Warned > 120000) {
        o2Warned = performance.now();
        toast(t('ev.lowO2'), 'warn');
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  if (summary && summary.seconds > 300) setUI({ welcome: summary });

  // Yerel platform
  if (isNative) {
    StatusBar.hide().catch(() => undefined);
    SplashScreen.hide().catch(() => undefined);
    CapApp.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) {
        gameCenter.sync();
        await writeSave(game.state);
        audio.suspend();
        scheduleNotifications(game);
      } else {
        audio.resume();
        cancelNotifications();
        const s = game.catchUp();
        if (s && s.seconds > 300) setUI({ welcome: s });
      }
    });
  } else {
    window.addEventListener('beforeunload', () => writeSave(game.state));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) writeSave(game.state);
      else {
        const s = game.catchUp();
        if (s && s.seconds > 300) setUI({ welcome: s });
      }
    });
  }
  // Servisler (arayüz açıldıktan sonra)
  setTimeout(() => {
    ads.init(game);
    iap.init(game).then(() => refresh());
    gameCenter.onChange = refresh;
    gameCenter.init(game);
  }, 1500);
  (window as unknown as { __game: Game }).__game = game;
  if (import.meta.env.DEV) Object.assign(window, { __scene: scene, __world: world });
}

boot();
