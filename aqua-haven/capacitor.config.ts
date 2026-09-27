import type { CapacitorConfig } from '@capacitor/cli';

// ÖNEMLİ: appId'yi App Store Connect'te oluşturacağınız Bundle ID ile değiştirin.
const config: CapacitorConfig = {
  appId: 'com.aquahaven.game',
  appName: 'Aqua Haven',
  webDir: 'dist',
  backgroundColor: '#04213a',
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    allowsLinkPreview: false,
    backgroundColor: '#04213a',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: false,
      backgroundColor: '#04213a',
      showSpinner: false,
    },
    LocalNotifications: {
      iconColor: '#2dd4bf',
    },
  },
};

export default config;
