import type { Bot } from 'grammy';
import { config } from '../config.js';
import { t, type LocaleKey } from '../i18n.js';
import { logger } from '../logger.js';
import type { LaborContext } from '../middleware/session.js';

export interface OrderPayload {
  telegram_id: number;
  locale?: LocaleKey;
  number: string;
  total?: string | number;
  provider?: string;
}

export const notifyPaid = async (bot: Bot<LaborContext>, p: OrderPayload): Promise<void> => {
  await safeSend(bot, p.telegram_id, t(p.locale ?? 'ru', 'order.paid', { number: p.number, total: p.total ?? '' }));
};

export const notifyShipped = async (bot: Bot<LaborContext>, p: OrderPayload): Promise<void> => {
  await safeSend(bot, p.telegram_id, t(p.locale ?? 'ru', 'order.shipped', { number: p.number, provider: p.provider ?? 'BTS' }));
};

export const notifyDelivered = async (bot: Bot<LaborContext>, p: OrderPayload): Promise<void> => {
  await safeSend(bot, p.telegram_id, t(p.locale ?? 'ru', 'order.delivered', { number: p.number }));
};

type ParseMode = 'HTML' | 'Markdown' | 'MarkdownV2';

export interface ChannelPayload {
  chat_id?: number | string;
  text?: string;
  parse_mode?: ParseMode;
}

const ALLOWED_CHANNEL_IDS = new Set<string>(
  [config.adminChatId].filter((id): id is string => id !== undefined)
);

export const notifyChannel = async (
  bot: Bot<LaborContext>,
  p: ChannelPayload
): Promise<{ ok: boolean; error?: string }> => {
  const chatId = p.chat_id;
  const text = p.text;
  if (chatId === undefined || chatId === null || chatId === '' || !text) {
    return { ok: false, error: 'missing chat_id or text' };
  }

  if (!ALLOWED_CHANNEL_IDS.has(String(chatId))) {
    logger.warn({ chatId }, 'notifyChannel: chat_id not in allowlist');
    return { ok: false, error: 'chat_id not in allowlist' };
  }

  try {
    await bot.api.sendMessage(chatId, text, {
      parse_mode: p.parse_mode ?? 'HTML',
      link_preview_options: { is_disabled: false }
    });
    return { ok: true };
  } catch (err) {
    logger.error({ err, chatId }, 'channel broadcast send failed');
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' };
  }
};

const safeSend = async (bot: Bot<LaborContext>, chatId: number, text: string): Promise<void> => {
  try {
    await bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.warn({ err, chatId }, 'notify send failed (user may have blocked the bot)');
  }
};
