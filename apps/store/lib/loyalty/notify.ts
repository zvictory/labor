// Loyalty messages over Telegram, to members who signed in with it. Best-effort:
// a failed message is logged and never undoes the ledger write it reports.

import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/seo';
import { getBot } from '@/lib/telegram/bot';
import { toBotLocale } from '@/lib/telegram/messages';
import { LOYALTY_MESSAGES } from '@/lib/loyalty/messages';
import type { DailyRunResult } from '@/lib/loyalty/loyalty';

const recipient = async (userId: number) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { telegramId: true, preferredLocale: true },
  });
  return user?.telegramId
    ? { chatId: user.telegramId.toString(), locale: toBotLocale(user.preferredLocale) }
    : null;
};

const send = async (chatId: string, text: string): Promise<boolean> => {
  try {
    await getBot().api.sendMessage(chatId, text, { link_preview_options: { is_disabled: true } });
    return true;
  } catch (err) {
    console.error('[loyalty/notify] sendMessage failed:', err);
    return false;
  }
};

/** "Bonus added", after a delivered order or a purchase at the counter. */
export const notifyEarned = async (
  userId: number,
  amount: number,
  balance: number,
): Promise<void> => {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  const to = await recipient(userId).catch(() => null);
  if (to) await send(to.chatId, LOYALTY_MESSAGES[to.locale].earned(amount, balance));
};

/** The birthday and "expires soon" messages a daily run collected. */
export const sendDailyNotices = async (
  notices: DailyRunResult['notices'],
): Promise<{ sent: number; failed: number }> => {
  const out = { sent: 0, failed: 0 };
  if (!process.env.TELEGRAM_BOT_TOKEN) return out;
  for (const notice of notices) {
    const to = await recipient(notice.userId).catch(() => null);
    if (!to) continue;
    const m = LOYALTY_MESSAGES[to.locale];
    const text =
      notice.kind === 'birthday'
        ? m.birthday(notice.amount, notice.until)
        : m.expiring(notice.amount, notice.on);
    if (await send(to.chatId, text)) out.sent += 1;
    else out.failed += 1;
  }
  return out;
};

/**
 * A message staff write to one member from the admin. Promotional by nature,
 * so it needs the member's marketing consent. Kept in LoyaltyMessage.
 */
export const sendPersonalMessage = async (input: {
  accountId: number;
  text: string;
  staffUserId: number;
}): Promise<'sent' | 'failed' | 'no_channel' | 'no_consent'> => {
  const account = await db.loyaltyAccount.findUnique({
    where: { id: input.accountId },
    select: { userId: true, marketingConsentAt: true },
  });
  if (!account) return 'failed';
  if (!account.marketingConsentAt) return 'no_consent';
  const to = process.env.TELEGRAM_BOT_TOKEN ? await recipient(account.userId) : null;
  const status = to ? ((await send(to.chatId, input.text)) ? 'sent' : 'failed') : 'no_channel';
  await db.loyaltyMessage.create({
    data: {
      accountId: input.accountId,
      channel: 'telegram',
      text: input.text,
      status,
      staffUserId: input.staffUserId,
    },
  });
  return status;
};

export const accountUrl = (locale: string): string => `${SITE_URL}/${locale}/account`;
