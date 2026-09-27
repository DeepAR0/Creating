import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from './platform';

let enabled = true;

export function setHapticsEnabled(v: boolean) {
  enabled = v;
}

export const haptic = {
  light() {
    if (enabled && isNative) Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
  },
  medium() {
    if (enabled && isNative) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
  },
  success() {
    if (enabled && isNative) Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
  },
  warning() {
    if (enabled && isNative) Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined);
  },
  select() {
    if (enabled && isNative) Haptics.selectionChanged().catch(() => undefined);
  },
};
