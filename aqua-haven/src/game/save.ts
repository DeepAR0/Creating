import { Preferences } from '@capacitor/preferences';
import type { GameState } from './types';

// iOS'ta Preferences = UserDefaults (uygulama güncellemelerinde korunur).
// Web'de localStorage kullanılır.
const KEY = 'aquahaven.save.v1';
const BACKUP_KEY = 'aquahaven.save.v1.bak';

let writes = 0;
let pending: Promise<void> | null = null;

function round(_k: string, v: unknown) {
  return typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 10000) / 10000 : v;
}

export async function loadSave(): Promise<unknown | null> {
  for (const key of [KEY, BACKUP_KEY]) {
    try {
      const { value } = await Preferences.get({ key });
      if (value) {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Kayıt okunamadı', key, e);
    }
  }
  return null;
}

export async function writeSave(state: GameState): Promise<void> {
  // Eşzamanlı yazmaları sıraya koy
  if (pending) await pending.catch(() => undefined);
  const json = JSON.stringify(state, round);
  pending = (async () => {
    await Preferences.set({ key: KEY, value: json });
    writes++;
    if (writes % 10 === 1) await Preferences.set({ key: BACKUP_KEY, value: json });
  })();
  try {
    await pending;
  } catch (e) {
    console.error('Kayıt yazılamadı', e);
  } finally {
    pending = null;
  }
}

export async function clearSave(): Promise<void> {
  await Preferences.remove({ key: KEY });
  await Preferences.remove({ key: BACKUP_KEY });
}
