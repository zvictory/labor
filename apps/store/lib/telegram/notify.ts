// Order notifications over Telegram. Best-effort by contract: every public
// function swallows its own errors so a notification failure can NEVER propagate
// into the payment state machine or a webhook response.
//
// Two recipients per event:
//   - the customer (User.telegramId on the order, if any) in their preferredLocale;
//   - an admin channel (TELEGRAM_ADMIN_CHAT_ID), if configured, always in ru.
//
// Messages are sent with parse_mode HTML, so every dynamic value is escaped.

import { db } from '@/lib/db';
import { getOrderByNumber, type OrderDTO } from '@/lib/orders/queries';
import { formatUzs } from '@/lib/money';
import { getBot } from '@/lib/telegram/bot';
import { NOTIFY_MESSAGES, statusLabel, toBotLocale, type BotLocale } from '@/lib/telegram/messages';

function escapeHtml(value: string | number): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface Recipient {
  telegramId: string;
  locale: BotLocale;
}

/// Resolve the order's customer recipient (telegramId + locale), if the order is
/// attached to a Telegram user. Returns null for guest orders or missing tg id.
async function customerRecipient(orderNumber: string): Promise<Recipient | null> {
  const row = await db.order
    .findUnique({
      where: { number: orderNumber },
      select: { user: { select: { telegramId: true, preferredLocale: true } } },
    })
    .catch(() => null);

  const user = row?.user;
  if (!user?.telegramId) return null;
  return { telegramId: user.telegramId, locale: toBotLocale(user.preferredLocale) };
}

/// Low-level send. Best-effort: logs and returns on any failure.
async function send(chatId: string | bigint, text: string): Promise<void> {
  try {
    await getBot().api.sendMessage(chatId.toString(), text, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('[telegram/notify] sendMessage failed:', err);
  }
}

function itemsCount(order: OrderDTO): number {
  return order.items.reduce((sum, it) => sum + it.quantity, 0);
}

/// Build the localized "paid" message body (HTML).
function paidBody(order: OrderDTO, locale: BotLocale): string {
  const m = NOTIFY_MESSAGES[locale];
  return [
    `<b>${m.paidTitle}</b>`,
    `${m.orderLabel}: <b>#${escapeHtml(order.number)}</b>`,
    `${m.itemsLabel}: ${itemsCount(order)}`,
    `${m.totalLabel}: ${escapeHtml(formatUzs(order.total, locale))}`,
  ].join('\n');
}

/// Build the localized "status changed" message body (HTML).
function statusBody(order: OrderDTO, status: string, locale: BotLocale): string {
  const m = NOTIFY_MESSAGES[locale];
  return [
    `<b>${m.statusTitle}</b>`,
    `${m.orderLabel}: <b>#${escapeHtml(order.number)}</b>`,
    `${m.statusFieldLabel}: <b>${escapeHtml(statusLabel(status, locale))}</b>`,
    `${m.itemsLabel}: ${itemsCount(order)}`,
    `${m.totalLabel}: ${escapeHtml(formatUzs(order.total, locale))}`,
  ].join('\n');
}

function adminChatId(): string | null {
  const id = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  return id ? id : null;
}

/// Notify customer + admin that an order has been paid. Best-effort throughout.
export async function notifyOrderPaid(orderNumber: string): Promise<void> {
  try {
    const recipient = await customerRecipient(orderNumber);
    const adminId = adminChatId();
    if (!recipient && !adminId) return; // nothing to do; skip the order load entirely

    // Load once in ru; re-resolve text per-locale (localization is name resolution +
    // formatUzs locale, both cheap to recompute — the heavy DB read happens once).
    const orderRu = await getOrderByNumber(orderNumber, recipient?.locale ?? 'ru');
    if (!orderRu) return;

    if (recipient) {
      const order =
        recipient.locale === 'ru'
          ? orderRu
          : ((await getOrderByNumber(orderNumber, recipient.locale)) ?? orderRu);
      await send(recipient.telegramId, paidBody(order, recipient.locale));
    }

    if (adminId) {
      await send(adminId, paidBody(orderRu, 'ru'));
    }
  } catch (err) {
    console.error('[telegram/notify] notifyOrderPaid failed:', err);
  }
}

/// Notify customer + admin of a generic status change. Best-effort throughout.
export async function notifyOrderStatus(orderNumber: string, status: string): Promise<void> {
  try {
    const recipient = await customerRecipient(orderNumber);
    const adminId = adminChatId();
    if (!recipient && !adminId) return;

    const orderRu = await getOrderByNumber(orderNumber, recipient?.locale ?? 'ru');
    if (!orderRu) return;

    if (recipient) {
      const order =
        recipient.locale === 'ru'
          ? orderRu
          : ((await getOrderByNumber(orderNumber, recipient.locale)) ?? orderRu);
      await send(recipient.telegramId, statusBody(order, status, recipient.locale));
    }

    if (adminId) {
      await send(adminId, statusBody(orderRu, status, 'ru'));
    }
  } catch (err) {
    console.error('[telegram/notify] notifyOrderStatus failed:', err);
  }
}
