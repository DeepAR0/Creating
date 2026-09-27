import type { FishState, QuestKind } from './types';

// Oyun olayları: UI, ses, görevler ve render katmanı bunları dinler.
export interface GameEvents {
  coins: { amount: number; x?: number; y?: number };
  pearls: { amount: number };
  xp: { amount: number; fishId?: string };
  levelUp: { level: number; coins: number; pearls: number };
  fishAdded: { tankId: string; fish: FishState; source: 'buy' | 'bred' | 'egg' | 'gift' | 'move' };
  fishRemoved: { tankId: string; fishId: string; reason: 'sold' | 'died' | 'move' };
  fishAdult: { tankId: string; fish: FishState };
  fishDied: { tankId: string; fish: FishState };
  fishSick: { tankId: string; fish: FishState };
  sold: { fish: FishState; value: number };
  fed: { fishId: string; xp: number };
  lucky: { tankId: string; fishId: string; coins: number; pearls: number };
  luckyCaught: { coins: number; pearls: number };
  clutchStarted: { tankId: string; sp: string };
  clutchEggs: { tankId: string; sp: string };
  bred: { tankId: string; sp: string; count: number; mutations: string[] };
  quest: { kind: QuestKind; amount: number };
  questComplete: { id: string };
  achievement: { id: string; tier: number };
  toast: { text: string; kind?: 'info' | 'good' | 'bad' | 'warn' };
  tankChanged: { tankId: string };
  sceneChanged: { tankId: string };
  decorChanged: { tankId: string };
  waterChanged: { tankId: string };
  pearlMade: { tankId: string; decorId: string };
  feederFed: { tankId: string; food: string };
  purchase: { productId: string };
  save: Record<string, never>;
  dayChanged: { day: string };
}

type Handler<T> = (payload: T) => void;

export class Emitter<E extends object> {
  private handlers: { [K in keyof E]?: Handler<E[K]>[] } = {};

  on<K extends keyof E>(type: K, h: Handler<E[K]>): () => void {
    (this.handlers[type] ??= []).push(h);
    return () => this.off(type, h);
  }

  off<K extends keyof E>(type: K, h: Handler<E[K]>) {
    const list = this.handlers[type];
    if (!list) return;
    const i = list.indexOf(h);
    if (i >= 0) list.splice(i, 1);
  }

  emit<K extends keyof E>(type: K, payload: E[K]) {
    const list = this.handlers[type];
    if (!list) return;
    for (const h of list.slice()) {
      try {
        h(payload);
      } catch (e) {
        console.error('event handler error', type, e);
      }
    }
  }
}
