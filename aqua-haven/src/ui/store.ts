import { useEffect, useState } from 'preact/hooks';
import type { Game } from '../game/game';
import type { Scene, Tool } from '../render/scene';
import type { World } from '../render/world';
import type { ErrCode, Result } from '../game/actions';
import type { OfflineSummary } from '../game/game';
import { t, type TKey } from '../i18n';
import { audio } from '../services/audio';
import { haptic } from '../services/haptics';

export type PanelId = 'shop' | 'fish' | 'breed' | 'quests' | 'tank' | 'guide' | 'settings' | 'store';

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'good' | 'bad' | 'warn';
}

export interface ConfirmReq {
  text: string;
  ok: string;
  resolve: (v: boolean) => void;
}

export const ui = {
  panel: null as PanelId | null,
  panelTab: '' as string,
  tool: 'hand' as Tool,
  selectedFish: null as string | null,
  decorSel: null as string | null,
  toasts: [] as Toast[],
  confirm: null as ConfirmReq | null,
  levelUp: null as { level: number; coins: number; pearls: number } | null,
  welcome: null as OfflineSummary | null,
  mockAd: null as { kind: 'rewarded' | 'interstitial'; resolve: (v: boolean) => void } | null,
  att: null as { resolve: () => void } | null,
  busy: false,
  foodOpen: false,
  photo: false,
  photoShot: null as string | null,
};

let game: Game;
let scene: Scene;
let world: World;
const listeners = new Set<() => void>();
let toastId = 1;

export function bindUI(g: Game, s: Scene, w: World) {
  game = g;
  scene = s;
  world = w;
}

export function getGame() {
  return game;
}
export function getScene() {
  return scene;
}
export function getWorld() {
  return world;
}

export function refresh() {
  for (const l of listeners) l();
}

export function setUI(patch: Partial<typeof ui>) {
  Object.assign(ui, patch);
  if (scene) {
    scene.tool = ui.tool;
    scene.selectedId = ui.selectedFish;
    scene.decorSel = ui.decorSel;
    scene.photo = ui.photo;
  }
  refresh();
}

/** Bileşeni UI değişikliklerinde ve isteğe bağlı olarak periyodik yeniler */
export function useUI(hz = 0) {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    let id: number | undefined;
    if (hz > 0) id = window.setInterval(l, 1000 / hz);
    return () => {
      listeners.delete(l);
      if (id) clearInterval(id);
    };
  }, [hz]);
  return ui;
}

export function toast(text: string, kind: Toast['kind'] = 'info') {
  const item = { id: toastId++, text, kind };
  ui.toasts = [...ui.toasts.slice(-2), item];
  refresh();
  setTimeout(() => {
    ui.toasts = ui.toasts.filter((x) => x.id !== item.id);
    refresh();
  }, kind === 'bad' ? 3200 : 2600);
}

export function errText(err?: ErrCode) {
  return t(`err.${err ?? 'invalid'}` as TKey);
}

/** Bir eylemi çalıştırır; hata varsa bildirir, başarıda ses çalar */
export function act<T>(r: Result<T>, okSound: Parameters<typeof audio.play>[0] | null = 'click'): Result<T> {
  if (!r.ok) {
    toast(errText(r.err), 'bad');
    audio.play('error');
    haptic.warning();
  } else if (okSound) {
    audio.play(okSound);
    haptic.light();
  }
  refresh();
  return r;
}

export function openPanel(panel: PanelId, tab = '') {
  audio.play('open');
  haptic.light();
  setUI({ panel, panelTab: tab, foodOpen: false });
}

export function closePanel() {
  setUI({ panel: null });
}

export function ask(text: string, ok = t('c.confirm')): Promise<boolean> {
  return new Promise((resolve) => setUI({ confirm: { text, ok, resolve } }));
}
