import { PRODUCTS, PRODUCT_IDS, STARTER_PACK } from '../config/monetization';
import type { Game } from './game';
import { createFish } from './state';

/** Satın alınan ürünün içeriğini oyuncuya verir. Aynı işlem iki kez verilmez. */
export function grantProduct(g: Game, productId: string, txId?: string): boolean {
  const s = g.state;
  if (txId && s.iap.granted.includes(txId)) return false;
  const p = PRODUCTS.find((x) => x.id === productId);
  if (!p) return false;
  if (p.type === 'consumable' && p.pearls) {
    g.addPearls(Math.round(p.pearls * (1 + (p.bonusPct ?? 0) / 100)));
  } else if (productId === PRODUCT_IDS.removeAds) {
    s.iap.removeAds = true;
  } else if (productId === PRODUCT_IDS.starter) {
    grantStarter(g);
  } else if (productId === PRODUCT_IDS.vip) {
    grantVipDecor(g);
  }
  if (txId) {
    s.iap.granted.push(txId);
    if (s.iap.granted.length > 300) s.iap.granted.splice(0, s.iap.granted.length - 300);
  }
  g.emit('purchase', { productId });
  return true;
}

export function grantStarter(g: Game) {
  const s = g.state;
  s.iap.starter = true;
  if (s.iap.starterGranted) return;
  s.iap.starterGranted = true;
  g.addPearls(STARTER_PACK.pearls);
  g.addCoins(STARTER_PACK.coins);
  for (const [k, v] of Object.entries(STARTER_PACK.food)) s.inv.food[k] = (s.inv.food[k] ?? 0) + v;
  const fresh = s.tanks.find((t) => t.type === 'fresh') ?? s.tanks[0];
  if (STARTER_PACK.feeder && !(fresh.equip.feeder ?? 0)) fresh.equip.feeder = 1;
  const fish = createFish(s, STARTER_PACK.species, g.lang(), { g: 0.3, sex: 'M' });
  fresh.fish.push(fish);
  s.discovered[STARTER_PACK.species] = Date.now();
  g.emit('fishAdded', { tankId: fresh.id, fish, source: 'gift' });
}

export function grantVipDecor(g: Game) {
  const s = g.state;
  if (s.flags.vipPalace) return;
  s.flags.vipPalace = 1;
  s.inv.decor.palace = (s.inv.decor.palace ?? 0) + 1;
}

/** Abonelik / kalıcı yetkileri RevenueCat bilgisine göre uygular */
export function applyEntitlements(g: Game, e: { noAds: boolean; vipUntil: number; starter: boolean }) {
  const s = g.state;
  s.iap.removeAds = s.iap.removeAds || e.noAds;
  s.iap.vipUntil = e.vipUntil;
  if (e.vipUntil > Date.now()) grantVipDecor(g);
  if (e.starter && !s.iap.starterGranted) grantStarter(g);
}
