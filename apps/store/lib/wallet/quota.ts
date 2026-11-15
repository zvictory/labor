// How often a member's phone may ring because of their Labor card. Google
// allows three notifications per pass in 24 hours, updates and messages
// together; Labor keeps promotional messages to one a week so the card stays
// welcome. Pure, so the admin preview and the send apply the same count.

export const GOOGLE_DAILY_MAX = 3;
export const PROMO_WEEKLY_MAX = 1;

const HOUR_MS = 60 * 60 * 1000;

export type NotificationKind = 'earn' | 'birthday' | 'tier' | 'promo' | 'personal';

export const canNotify = (
  history: readonly { kind: string; createdAt: Date }[],
  kind: NotificationKind,
  now: Date,
): boolean => {
  const lastDay = history.filter((h) => now.getTime() - h.createdAt.getTime() < 24 * HOUR_MS);
  if (lastDay.length >= GOOGLE_DAILY_MAX) return false;
  // Keep the last of the three for the member's own news (bonus, birthday).
  if ((kind === 'promo' || kind === 'personal') && lastDay.length >= GOOGLE_DAILY_MAX - 1)
    return false;
  if (kind === 'promo') {
    const lastWeek = history.filter(
      (h) => h.kind === 'promo' && now.getTime() - h.createdAt.getTime() < 7 * 24 * HOUR_MS,
    );
    if (lastWeek.length >= PROMO_WEEKLY_MAX) return false;
  }
  return true;
};
