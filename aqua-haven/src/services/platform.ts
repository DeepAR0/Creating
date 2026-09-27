import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();
export const isIOS = platform === 'ios';

/** Web önizlemesinde sahte satın alma/reklam kullanılsın mı? */
export const mockServices =
  !isNative && (import.meta.env.DEV || new URLSearchParams(location.search).has('mock'));

export function openUrl(url: string) {
  try {
    window.open(url, '_blank');
  } catch {
    location.href = url;
  }
}
