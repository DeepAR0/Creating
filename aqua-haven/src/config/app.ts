// =============================================================================
//  YAYIN ÖNCESİ DOLDURULACAK AYARLAR
//  App Store'a göndermeden önce aşağıdaki "REPLACE" / örnek değerleri kendi
//  hesap bilgilerinizle değiştirin. Ayrıntılı adımlar: docs/APP_STORE_REHBERI.md
// =============================================================================

export const APP = {
  name: 'Aqua Haven',
  version: '1.0.0',
  /** Destek e-postası (App Store'da da istenir) */
  supportEmail: 'destek@ornek-alanadi.com',
  /** Gizlilik politikası adresi (zorunlu). docs/legal/gizlilik-politikasi.md dosyasını yayınlayın. */
  privacyUrl: 'https://ornek-alanadi.com/aquahaven/gizlilik',
  /** Kullanım koşulları — abonelik için zorunlu. Apple'ın standart EULA'sı kullanılabilir. */
  termsUrl: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  /** App Store uygulama kimliği (yayınlandıktan sonra "puan ver" bağlantısı için) */
  appStoreId: '0000000000',
};

export const ADS = {
  /**
   * true iken Google'ın resmi TEST reklamları gösterilir. Yayında false yapın.
   * (Test reklamlarına tıklamak hesabınıza zarar vermez; gerçek reklamlara kendiniz tıklamayın!)
   */
  testing: true,
  /** AdMob uygulama kimliği — ios/App/App/Info.plist içindeki GADApplicationIdentifier ile aynı olmalı */
  appIdIOS: 'ca-app-pub-3940256099942544~1458002511',
  rewardedIOS: 'ca-app-pub-3940256099942544/1712485313',
  interstitialIOS: 'ca-app-pub-3940256099942544/4411468910',
  /** Aile dostu içerik için reklam içerik sınırı */
  maxContentRating: 'ParentalGuidance' as const,
};

export const IAP = {
  /** RevenueCat → Project settings → API keys → App Store (appl_ ile başlar) */
  revenueCatApiKeyIOS: 'appl_REPLACE_WITH_YOUR_REVENUECAT_KEY',
  /** RevenueCat'te tanımlayacağınız yetki (entitlement) kimlikleri */
  entitlementNoAds: 'no_ads',
  entitlementVip: 'vip',
};
