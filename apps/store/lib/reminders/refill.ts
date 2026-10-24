// "Time to refill" reminders. A 10 ml decant lasts about a month, so some 25
// days after an order is delivered the customer gets one Telegram message with
// links back to what they bought. Only people who signed in with Telegram and
// have not sent /stop are reached; the message carries the same /stop footer as
// the admin's announcements.
//
// At most one reminder per order, and never a second one to a person within
// REFILL_COOLDOWN_DAYS. An order is skipped when the customer has ordered again
// since. Orders delivered longer ago than the window are never reminded, so a
// day the job did not run is caught up but old orders are not dug out.
//
// Runs from /api/cron/refill-reminders (a daily cron on the server) or from the
// admin page /admin/reminders. The links carry utm tags, so orders that follow
// show up in /admin/sources as telegram / reminder / refill.

import { resolveLocaleText } from '@/lib/catalog/locale';
import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/seo';
import { getBot } from '@/lib/telegram/bot';
import { BOT_MESSAGES, toBotLocale, type BotLocale } from '@/lib/telegram/messages';

export const REFILL_DEFAULT_DAYS = 25;
/** How many days after the due day an order still gets its reminder. */
export const REFILL_WINDOW_DAYS = 14;
export const REFILL_COOLDOWN_DAYS = 20;
export const REFILL_MAX_PER_RUN = 300;
const MAX_LINKS = 3;
const PAUSE_MS = 40;
const DAY_MS = 24 * 60 * 60 * 1000;

/** REFILL_REMINDER_DAYS when it is a whole number of days from 7 to 90, else 25. */
export const refillDays = (raw: string | undefined = process.env.REFILL_REMINDER_DAYS): number => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 7 && n <= 90 ? n : REFILL_DEFAULT_DAYS;
};

export interface RefillCandidate {
  orderId: number;
  number: string;
  userId: number;
  telegramId: bigint;
  locale: string;
  createdAt: Date;
  deliveredAt: Date;
  /** Full-size items only, named in the customer's language; samples are not refilled. */
  products: { slug: string; name: string }[];
}

/**
 * Which candidates get a reminder now: not re-bought since, the person not
 * reminded lately, and one order per person (the latest delivered). Pure.
 */
export const pickRefillReminders = (
  candidates: readonly RefillCandidate[],
  ctx: {
    /** Each user's most recent non-canceled order. */
    lastOrderAt: ReadonlyMap<number, Date>;
    /** Users reminded within the cooldown. */
    recentlyReminded: ReadonlySet<number>;
  },
  max: number = REFILL_MAX_PER_RUN,
): RefillCandidate[] => {
  const byUser = new Map<number, RefillCandidate>();
  for (const c of candidates) {
    if (c.products.length === 0) continue;
    if (ctx.recentlyReminded.has(c.userId)) continue;
    const last = ctx.lastOrderAt.get(c.userId);
    if (last && last.getTime() > c.createdAt.getTime()) continue;
    const kept = byUser.get(c.userId);
    if (!kept || kept.deliveredAt < c.deliveredAt) byUser.set(c.userId, c);
  }
  return [...byUser.values()]
    .sort((a, b) => a.deliveredAt.getTime() - b.deliveredAt.getTime())
    .slice(0, max);
};

const COPY: Record<BotLocale, { intro: (number: string) => string; outro: string }> = {
  ru: {
    intro: (number) =>
      `Здравствуйте! С заказа ${number} прошёл почти месяц. Если аромат подходит к концу, его можно повторить здесь:`,
    outro: 'Или загляните в Labor: подберём что-то новое к сезону.',
  },
  uz: {
    intro: (number) =>
      `Assalomu alaykum! ${number} buyurtmangizga bir oyga yaqin boʻldi. Atiringiz tugab qolayotgan boʻlsa, uni shu yerda qayta buyurtma qilishingiz mumkin:`,
    outro: 'Yoki Labor filiallariga keling: mavsumga mos yangi hid tanlab beramiz.',
  },
  en: {
    intro: (number) =>
      `Hello! It has been almost a month since order ${number}. If your perfume is running low, you can reorder it here:`,
    outro: 'Or drop by Labor and we will find something new for the season.',
  },
};

export const refillLink = (slug: string, locale: BotLocale): string =>
  `${SITE_URL}/${locale}/product/${encodeURIComponent(slug)}?utm_source=telegram&utm_medium=reminder&utm_campaign=refill`;

/** The plain-text message one customer receives. */
export const refillMessage = (
  c: Pick<RefillCandidate, 'number' | 'locale' | 'products'>,
): string => {
  const locale = toBotLocale(c.locale);
  const copy = COPY[locale];
  const lines = c.products
    .slice(0, MAX_LINKS)
    .map((p) => `• ${p.name} — ${refillLink(p.slug, locale)}`);
  return [
    copy.intro(c.number),
    ...lines,
    '',
    copy.outro,
    '',
    BOT_MESSAGES[locale].broadcastFooter,
  ].join('\n');
};

/** Orders whose reminder is due now, already filtered (pickRefillReminders). */
export const loadDueReminders = async (now: Date = new Date()): Promise<RefillCandidate[]> => {
  const days = refillDays();
  const orders = await db.order.findMany({
    where: {
      status: 'delivered',
      refillReminderAt: null,
      deliveredAt: {
        lte: new Date(now.getTime() - days * DAY_MS),
        gte: new Date(now.getTime() - (days + REFILL_WINDOW_DAYS) * DAY_MS),
      },
      user: { telegramId: { not: null }, broadcastOptOut: false },
    },
    select: {
      id: true,
      number: true,
      createdAt: true,
      deliveredAt: true,
      user: { select: { id: true, telegramId: true, preferredLocale: true } },
      items: {
        where: { isSample: false },
        select: { product: { select: { slug: true, name: true } } },
      },
    },
  });

  const candidates: RefillCandidate[] = orders.flatMap((o) =>
    o.user?.telegramId && o.deliveredAt
      ? [
          {
            orderId: o.id,
            number: o.number,
            userId: o.user.id,
            telegramId: o.user.telegramId,
            locale: o.user.preferredLocale,
            createdAt: o.createdAt,
            deliveredAt: o.deliveredAt,
            products: [
              ...new Map(
                o.items.map((i) => [
                  i.product.slug,
                  {
                    slug: i.product.slug,
                    name: resolveLocaleText(i.product.name, toBotLocale(o.user?.preferredLocale)),
                  },
                ]),
              ).values(),
            ],
          },
        ]
      : [],
  );
  if (candidates.length === 0) return [];

  const userIds = [...new Set(candidates.map((c) => c.userId))];
  const [latest, reminded] = await Promise.all([
    db.order.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, status: { not: 'canceled' } },
      _max: { createdAt: true },
    }),
    db.order.findMany({
      where: {
        userId: { in: userIds },
        refillReminderAt: { gte: new Date(now.getTime() - REFILL_COOLDOWN_DAYS * DAY_MS) },
      },
      select: { userId: true },
    }),
  ]);

  return pickRefillReminders(candidates, {
    lastOrderAt: new Map(
      latest.flatMap((g) =>
        g.userId !== null && g._max.createdAt ? [[g.userId, g._max.createdAt]] : [],
      ),
    ),
    recentlyReminded: new Set(reminded.flatMap((r) => (r.userId !== null ? [r.userId] : []))),
  });
};

const isBlocked = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'error_code' in err &&
  (err as { error_code: unknown }).error_code === 403;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface RefillRunResult {
  due: number;
  sent: number;
  failed: number;
}

/**
 * Send every due reminder. Each order is claimed (refillReminderAt set) before
 * its message goes out, so two runs at once never send twice; a failed send is
 * not retried. A customer who blocked the bot is opted out of messages.
 */
export const sendRefillReminders = async (now: Date = new Date()): Promise<RefillRunResult> => {
  const due = await loadDueReminders(now);
  const result: RefillRunResult = { due: due.length, sent: 0, failed: 0 };
  if (due.length === 0) return result;

  const bot = getBot();
  for (const c of due) {
    const claimed = await db.order.updateMany({
      where: { id: c.orderId, refillReminderAt: null },
      data: { refillReminderAt: now },
    });
    if (claimed.count === 0) continue;
    try {
      await bot.api.sendMessage(c.telegramId.toString(), refillMessage(c), {
        link_preview_options: { is_disabled: true },
      });
      result.sent += 1;
    } catch (err) {
      result.failed += 1;
      if (isBlocked(err)) {
        await db.user
          .update({ where: { id: c.userId }, data: { broadcastOptOut: true } })
          .catch(() => undefined);
      } else {
        console.error(`[refill] ${c.number}:`, err);
      }
    }
    await sleep(PAUSE_MS);
  }
  return result;
};
