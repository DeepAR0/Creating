import type { GameEvents } from '../events';
import type { GameState, Lang } from '../types';

/** Simülasyonun oyun çekirdeğine eriştiği arayüz (döngüsel bağımlılığı önler) */
export interface SimHost {
  state: GameState;
  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void;
  addXp(amount: number, fishId?: string): void;
  addCoins(amount: number, earned?: boolean): void;
  addPearls(amount: number): void;
  progress(kind: GameEvents['quest']['kind'], amount?: number): void;
  lang(): Lang;
  /** Çevrimdışı hesaplama sırasında true */
  offline: boolean;
  /** Şu an ekranda görünen tank id'si (çevrimiçiyken) */
  activeTankId(): string | null;
}
