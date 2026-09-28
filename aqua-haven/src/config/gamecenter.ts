// App Store Connect → Game Center'da bu kimliklerle oluşturulmalıdır (docs/app-store-metinleri.md).
export const GC_LEADERBOARDS = {
  level: 'aquahaven.lb.level',
  beauty: 'aquahaven.lb.beauty',
  coins: 'aquahaven.lb.coins',
} as const;

/** Oyundaki her başarım, Game Center'da kademelerine göre yüzdesi ilerleyen tek bir başarıma karşılık gelir */
export function gcAchievementId(id: string): string {
  return `aquahaven.ach.${id}`;
}
