import { LocalNotifications } from '@capacitor/local-notifications';
import type { Game } from '../game/game';
import { getSpecies } from '../data/species';
import { tipCap, tipRatePerMin } from '../game/sim/economy';
import { t } from '../i18n';
import { isNative } from './platform';

// Yerel bildirimler: aç balıklar, dolan ziyaretçi kutusu, çıkan yavrular, yeni günlük görevler.

export async function requestNotifications(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const p = await LocalNotifications.requestPermissions();
    return p.display === 'granted';
  } catch {
    return false;
  }
}

export async function cancelNotifications() {
  if (!isNative) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  } catch {
    /* yoksay */
  }
}

export async function scheduleNotifications(g: Game) {
  if (!isNative || !g.state.settings.notifications) return;
  await cancelNotifications();
  const now = Date.now();
  const list: { id: number; title: string; body: string; at: Date }[] = [];
  const add = (id: number, body: string, secs: number) => {
    if (secs < 600 || secs > 3 * 86400) return;
    list.push({ id, title: t('app.name'), body, at: new Date(now + secs * 1000) });
  };
  // Aç balıklar: en erken tokluğu 20'nin altına düşecek balık
  let hungry = Infinity;
  for (const tank of g.state.tanks) {
    if (tank.equip.feeder) continue;
    for (const f of tank.fish) {
      const sp = getSpecies(f.sp);
      hungry = Math.min(hungry, ((f.food - 20) / 100) * sp.hunger);
    }
  }
  if (Number.isFinite(hungry)) add(1, t('notif.hungry'), Math.max(hungry, 1800));
  // Ziyaretçi kutusu dolumu
  const tank = g.tank;
  const rate = tipRatePerMin(g.state, tank);
  if (rate > 0) add(2, t('notif.tips'), ((tipCap(g.state, tank) - tank.tips) / rate) * 60);
  // En yakın yavru çıkışı
  const clutch = g.state.tanks.flatMap((x) => x.clutches).sort((a, b) => a.t - b.t)[0];
  if (clutch) add(3, t('notif.hatch'), clutch.t + (clutch.stage === 'court' ? getSpecies(clutch.sp).breed?.hatch ?? 0 : 0));
  // Ertesi gün saat 10:00
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 10, 0, 0);
  add(4, t('notif.daily'), (next.getTime() - now) / 1000);
  if (!list.length) return;
  try {
    await LocalNotifications.schedule({
      notifications: list.map((n) => ({ id: n.id, title: n.title, body: n.body, schedule: { at: n.at, allowWhileIdle: true } })),
    });
  } catch {
    /* yoksay */
  }
}
