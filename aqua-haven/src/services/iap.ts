import { Purchases, PRODUCT_CATEGORY, type CustomerInfo, type PurchasesStoreProduct } from '@revenuecat/purchases-capacitor';
import { IAP } from '../config/app';
import { PRODUCTS, PRODUCT_IDS } from '../config/monetization';
import type { Game } from '../game/game';
import { applyEntitlements, grantProduct } from '../game/purchases';
import { isNative, mockServices } from './platform';

export type PurchaseResult = 'ok' | 'cancelled' | 'failed' | 'unavailable';

class IapService {
  private game: Game | null = null;
  private products = new Map<string, PurchasesStoreProduct>();
  ready = false;

  price(id: string): string {
    return this.products.get(id)?.priceString ?? PRODUCTS.find((p) => p.id === id)?.fallbackPrice ?? '';
  }

  get configured() {
    return isNative && !IAP.revenueCatApiKeyIOS.includes('REPLACE');
  }

  async init(game: Game) {
    this.game = game;
    if (!this.configured) {
      this.ready = mockServices;
      return;
    }
    try {
      await Purchases.configure({ apiKey: IAP.revenueCatApiKeyIOS });
      const ids = PRODUCTS.map((p) => p.id);
      const [a, b] = await Promise.all([
        Purchases.getProducts({ productIdentifiers: ids, type: PRODUCT_CATEGORY.NON_SUBSCRIPTION }),
        Purchases.getProducts({ productIdentifiers: ids, type: PRODUCT_CATEGORY.SUBSCRIPTION }),
      ]);
      for (const p of [...a.products, ...b.products]) this.products.set(p.identifier, p);
      this.ready = true;
      const { customerInfo } = await Purchases.getCustomerInfo();
      this.sync(customerInfo);
      Purchases.addCustomerInfoUpdateListener((info) => this.sync(info));
    } catch (e) {
      console.warn('RevenueCat başlatılamadı', e);
    }
  }

  /** Yetkileri uygular ve yarım kalmış (verilmemiş) tüketilebilir alımları tamamlar */
  private sync(info: CustomerInfo) {
    const g = this.game;
    if (!g) return;
    const vip = info.entitlements.active[IAP.entitlementVip];
    const noAds = !!info.entitlements.active[IAP.entitlementNoAds] || info.allPurchasedProductIdentifiers.includes(PRODUCT_IDS.removeAds);
    applyEntitlements(g, {
      noAds,
      vipUntil: vip ? (vip.expirationDateMillis ?? Date.now() + 30 * 86400000) : 0,
      starter: info.allPurchasedProductIdentifiers.includes(PRODUCT_IDS.starter),
    });
    // Uygulama satın alma sırasında kapandıysa: bu kayıttan sonra yapılmış ama verilmemiş işlemleri ver
    for (const tx of info.nonSubscriptionTransactions) {
      const when = Date.parse(tx.purchaseDate);
      if (when >= g.state.createdAt && !g.state.iap.granted.includes(tx.transactionIdentifier)) {
        const p = PRODUCTS.find((x) => x.id === tx.productIdentifier);
        if (p?.type === 'consumable') grantProduct(g, p.id, tx.transactionIdentifier);
      }
    }
  }

  async purchase(id: string): Promise<PurchaseResult> {
    const g = this.game;
    if (!g) return 'unavailable';
    if (!this.configured) {
      if (!mockServices) return 'unavailable';
      await new Promise((r) => setTimeout(r, 600));
      grantProduct(g, id, `mock-${Date.now()}`);
      if (id === PRODUCT_IDS.vip) g.state.iap.vipUntil = Date.now() + 30 * 86400000;
      return 'ok';
    }
    const product = this.products.get(id);
    if (!product) return 'unavailable';
    try {
      const res = await Purchases.purchaseStoreProduct({ product });
      grantProduct(g, id, res.transaction?.transactionIdentifier);
      this.sync(res.customerInfo);
      return 'ok';
    } catch (e) {
      const err = e as { userCancelled?: boolean; code?: string };
      if (err?.userCancelled) return 'cancelled';
      console.warn('Satın alma hatası', e);
      return 'failed';
    }
  }

  async restore(): Promise<boolean> {
    if (!this.configured) return mockServices;
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      this.sync(customerInfo);
      return true;
    } catch {
      return false;
    }
  }
}

export const iap = new IapService();
