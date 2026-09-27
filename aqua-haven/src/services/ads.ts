import {
  AdMob,
  AdmobConsentStatus,
  InterstitialAdPluginEvents,
  MaxAdContentRating,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { ADS } from '../config/app';
import { INTERSTITIAL_RULES, REWARDED_LIMITS } from '../config/monetization';
import type { Game } from '../game/game';
import { adsRemoved } from '../game/state';
import { isIOS, isNative, mockServices } from './platform';

/** Web önizlemesi için sahte reklam katmanı (UI tarafından atanır) */
export let mockAdUI: ((kind: 'rewarded' | 'interstitial') => Promise<boolean>) | null = null;
export function setMockAdUI(fn: typeof mockAdUI) {
  mockAdUI = fn;
}

/** ATT öncesi açıklama ekranı (UI tarafından atanır) */
export let attPrePrompt: (() => Promise<void>) | null = null;
export function setAttPrePrompt(fn: typeof attPrePrompt) {
  attPrePrompt = fn;
}

class AdsService {
  private game: Game | null = null;
  private ready = false;
  private rewardedLoaded = false;
  private interstitialLoaded = false;
  private lastInterstitial = 0;
  private sells = 0;
  privacyRequired = false;

  async init(game: Game) {
    this.game = game;
    if (!isNative) {
      this.ready = mockServices;
      return;
    }
    try {
      await AdMob.initialize({
        maxAdContentRating: MaxAdContentRating.ParentalGuidance,
        initializeForTesting: ADS.testing,
      });
      // 1) GDPR / UMP onayı
      let consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
        consent = await AdMob.showConsentForm();
      }
      this.privacyRequired = consent.privacyOptionsRequirementStatus === 'REQUIRED';
      // 2) iOS App Tracking Transparency
      if (isIOS) {
        const st = await AdMob.trackingAuthorizationStatus();
        if (st.status === 'notDetermined') {
          if (attPrePrompt) await attPrePrompt();
          await AdMob.requestTrackingAuthorization();
        }
      }
      if (!consent.canRequestAds) return;
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => this.loadRewarded());
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => this.loadInterstitial());
      this.ready = true;
      this.loadRewarded();
      this.loadInterstitial();
    } catch (e) {
      console.warn('AdMob başlatılamadı', e);
    }
  }

  private async loadRewarded() {
    if (!isNative || !this.ready) return;
    try {
      await AdMob.prepareRewardVideoAd({ adId: ADS.rewardedIOS, isTesting: ADS.testing });
      this.rewardedLoaded = true;
    } catch {
      this.rewardedLoaded = false;
      setTimeout(() => this.loadRewarded(), 30000);
    }
  }

  private async loadInterstitial() {
    if (!isNative || !this.ready || (this.game && adsRemoved(this.game.state))) return;
    try {
      await AdMob.prepareInterstitial({ adId: ADS.interstitialIOS, isTesting: ADS.testing });
      this.interstitialLoaded = true;
    } catch {
      this.interstitialLoaded = false;
      setTimeout(() => this.loadInterstitial(), 45000);
    }
  }

  /** Günlük sınır kalan hak */
  remaining(placement: string): number {
    const s = this.game?.state;
    if (!s) return 0;
    const limit = REWARDED_LIMITS[placement] ?? 5;
    return Math.max(0, limit - (s.daily.ads[placement] ?? 0));
  }

  available(placement: string): boolean {
    return this.ready && this.remaining(placement) > 0;
  }

  /** Ödüllü reklam: izlenip ödül kazanıldıysa true döner */
  async showRewarded(placement: string): Promise<boolean> {
    const s = this.game?.state;
    if (!s || !this.available(placement)) return false;
    let rewarded = false;
    if (!isNative) {
      rewarded = mockAdUI ? await mockAdUI('rewarded') : true;
    } else {
      if (!this.rewardedLoaded) await this.loadRewarded();
      if (!this.rewardedLoaded) return false;
      try {
        this.rewardedLoaded = false;
        const item = await AdMob.showRewardVideoAd();
        rewarded = !!item;
      } catch {
        rewarded = false;
      }
    }
    if (rewarded) {
      s.daily.ads[placement] = (s.daily.ads[placement] ?? 0) + 1;
      s.stats.adsWatched++;
      this.lastInterstitial = Date.now(); // ödüllüden hemen sonra geçiş reklamı gösterme
    }
    return rewarded;
  }

  noteSell() {
    this.sells++;
  }

  /** Doğal bir mola noktasında, kurallar izin veriyorsa geçiş reklamı */
  async maybeInterstitial(): Promise<void> {
    const g = this.game;
    if (!g || !this.ready) return;
    const s = g.state;
    if (adsRemoved(s) || !s.tutorial.done) return;
    if (s.player.level < INTERSTITIAL_RULES.minLevel) return;
    if (g.sessionSec < INTERSTITIAL_RULES.minSessionSec) return;
    if (Date.now() - this.lastInterstitial < INTERSTITIAL_RULES.minIntervalSec * 1000) return;
    if (this.sells < INTERSTITIAL_RULES.sellsPerAd) return;
    this.sells = 0;
    this.lastInterstitial = Date.now();
    if (!isNative) {
      if (mockAdUI) await mockAdUI('interstitial');
      return;
    }
    if (!this.interstitialLoaded) return;
    try {
      this.interstitialLoaded = false;
      await AdMob.showInterstitial();
    } catch {
      /* yoksay */
    }
  }

  async showPrivacyOptions() {
    if (!isNative) return;
    try {
      await AdMob.showPrivacyOptionsForm();
    } catch {
      /* yoksay */
    }
  }
}

export const ads = new AdsService();
