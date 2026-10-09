// Announcements from the admin to everyone who talks to the bot: a new
// campaign, a first-order code, a restock. Staff write the text per language;
// each recipient gets it in their own (User.preferredLocale), with a /stop line.
//
// Sending runs after the admin's request has answered (next/server `after`),
// paced under Telegram's ~30 messages a second, and records
// its progress on the Broadcast row. Recipients are Telegram users who have
// not sent /stop; a user who blocked the bot fails with 403 and is opted out
// so the next announcement skips them.

import type { Prisma } from '@prisma/client';
import { after } from 'next/server';

import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { getBot } from '@/lib/telegram/bot';
import { BOT_MESSAGES, toBotLocale } from '@/lib/telegram/messages';
import type { LocaleText } from '@/lib/catalog/types';

const PAUSE_MS = 40; // ~25 messages a second
const BATCH = 200;
/** A broadcast still "sending" after this long is treated as dead (server restart). */
const STALE_MS = 60 * 60 * 1000;

export const recipientsWhere: Prisma.UserWhereInput = {
  telegramId: { not: null },
  broadcastOptOut: false,
};

export const countRecipients = (): Promise<number> => db.user.count({ where: recipientsWhere });

/** The text one recipient receives. */
export const broadcastMessage = (text: LocaleText, locale: string): string => {
  const body = resolveLocaleText(text, locale).trim();
  return `${body}\n\n${BOT_MESSAGES[toBotLocale(locale)].broadcastFooter}`;
};

/** Telegram answers 403 when the user blocked the bot or deleted the account. */
const isBlocked = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'error_code' in err &&
  (err as { error_code: unknown }).error_code === 403;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async (broadcastId: number, text: LocaleText): Promise<void> => {
  const bot = getBot();
  let sent = 0;
  let failed = 0;
  let cursor = 0;

  try {
    for (;;) {
      const users = await db.user.findMany({
        where: { ...recipientsWhere, id: { gt: cursor } },
        orderBy: { id: 'asc' },
        take: BATCH,
        select: { id: true, telegramId: true, preferredLocale: true },
      });
      if (users.length === 0) break;

      for (const user of users) {
        cursor = user.id;
        if (user.telegramId === null) continue;
        try {
          await bot.api.sendMessage(
            user.telegramId.toString(),
            broadcastMessage(text, user.preferredLocale),
            { link_preview_options: { is_disabled: true } },
          );
          sent += 1;
        } catch (err) {
          failed += 1;
          if (isBlocked(err)) {
            await db.user
              .update({ where: { id: user.id }, data: { broadcastOptOut: true } })
              .catch(() => undefined);
          }
        }
        await sleep(PAUSE_MS);
      }

      await db.broadcast.update({ where: { id: broadcastId }, data: { sent, failed } });
    }
  } catch (err) {
    console.error('[broadcast] stopped early:', err);
  } finally {
    await db.broadcast
      .update({
        where: { id: broadcastId },
        data: { sent, failed, status: 'done', finishedAt: new Date() },
      })
      .catch((err) => console.error('[broadcast] could not close the log row:', err));
  }
};

export type StartBroadcastResult =
  | { ok: true; id: number; recipients: number }
  | { ok: false; error: 'already_sending' | 'no_bot' | 'no_recipients' };

/** Log the broadcast and start sending; returns once the row exists. */
export const startBroadcast = async (
  text: LocaleText,
  createdBy: string | null,
): Promise<StartBroadcastResult> => {
  if (!process.env.TELEGRAM_BOT_TOKEN) return { ok: false, error: 'no_bot' };

  const running = await db.broadcast.findFirst({
    where: { status: 'sending', createdAt: { gt: new Date(Date.now() - STALE_MS) } },
    select: { id: true },
  });
  if (running) return { ok: false, error: 'already_sending' };

  const recipients = await countRecipients();
  if (recipients === 0) return { ok: false, error: 'no_recipients' };

  const row = await db.broadcast.create({
    data: { text: text as unknown as Prisma.InputJsonValue, recipients, createdBy },
    select: { id: true },
  });

  // After the response: the admin's request returns now and the page shows progress.
  after(() => run(row.id, text));
  return { ok: true, id: row.id, recipients };
};
