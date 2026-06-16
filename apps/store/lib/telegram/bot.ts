// grammy Bot singleton (webhook mode). The Next webhook route feeds updates in
// via getBot().handleUpdate(...) — there is no long-poll / separate process.
//
// Handlers: /start, /help, /lang (with inline ru/uz/en switcher), and a text
// fallback. /lang persists User.preferredLocale keyed by telegramId so future
// notifications go out in the chosen language.
//
// The bot is lazily constructed so importing this module (e.g. from the route or
// from notify.ts) never throws when TELEGRAM_BOT_TOKEN is unset at build time.

import { Bot, InlineKeyboard, type Context } from 'grammy';
import { db } from '@/lib/db';
import { BOT_MESSAGES, toBotLocale, type BotLocale } from '@/lib/telegram/messages';

let cachedBot: Bot | null = null;
let cachedToken: string | null = null;

/// Canonical store URL surfaced in /start. Mini-app username is optional; if
/// TELEGRAM_BOT_USERNAME is set we could deep-link, but the web URL works for all.
function storeUrl(): string {
  return process.env.NEXTAUTH_URL?.replace(/\/+$/, '') ?? 'https://labor.local';
}

/// Resolve the chat's preferred locale from the persisted User row (by telegramId),
/// falling back to the Telegram client language, then ru.
async function resolveLocale(ctx: Context): Promise<BotLocale> {
  const tgId = ctx.from?.id;
  if (tgId != null) {
    const user = await db.user
      .findUnique({
        where: { telegramId: BigInt(tgId) },
        select: { preferredLocale: true },
      })
      .catch(() => null);
    if (user) return toBotLocale(user.preferredLocale);
  }
  return toBotLocale(ctx.from?.language_code ?? null);
}

/// Persist a chosen locale onto the User row matched by telegramId. Upserts so a
/// /lang before the auth flow has created the user still records the preference.
async function persistLocale(telegramId: number, locale: BotLocale): Promise<void> {
  const tgId = BigInt(telegramId);
  await db.user.upsert({
    where: { telegramId: tgId },
    update: { preferredLocale: locale },
    create: {
      telegramId: tgId,
      email: `tg_${telegramId}@labor.local`,
      preferredLocale: locale,
    },
  });
}

function langKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Русский', 'lang:ru')
    .text('O‘zbek', 'lang:uz')
    .text('English', 'lang:en');
}

function registerHandlers(bot: Bot): void {
  bot.command('start', async (ctx) => {
    const locale = await resolveLocale(ctx);
    await ctx.reply(BOT_MESSAGES[locale].start(storeUrl()));
  });

  bot.command('help', async (ctx) => {
    const locale = await resolveLocale(ctx);
    await ctx.reply(BOT_MESSAGES[locale].help);
  });

  bot.command('lang', async (ctx) => {
    const locale = await resolveLocale(ctx);
    await ctx.reply(BOT_MESSAGES[locale].langPrompt, { reply_markup: langKeyboard() });
  });

  // Inline language switcher callbacks: "lang:<ru|uz|en>".
  bot.callbackQuery(/^lang:(ru|uz|en)$/, async (ctx) => {
    const next = toBotLocale(ctx.match?.[1] ?? 'ru');
    const tgId = ctx.from?.id;
    if (tgId != null) {
      await persistLocale(tgId, next).catch(() => undefined);
    }
    await ctx.answerCallbackQuery();
    await ctx.reply(BOT_MESSAGES[next].langSet);
  });

  // Fallback for any unmatched text message.
  bot.on('message:text', async (ctx) => {
    const locale = await resolveLocale(ctx);
    await ctx.reply(BOT_MESSAGES[locale].fallback);
  });
}

/// Lazily construct the grammy Bot from TELEGRAM_BOT_TOKEN. Rebuilds if the token
/// env changes (test/dev). Throws only if the token is genuinely missing — the
/// webhook route guards on the secret header before ever reaching here.
export function getBot(): Bot {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set; cannot construct Telegram bot.');
  }
  if (!cachedBot || cachedToken !== token) {
    const bot = new Bot(token);
    registerHandlers(bot);
    cachedBot = bot;
    cachedToken = token;
  }
  return cachedBot;
}

/// Convenience accessor mirroring the bebio reference. Same lazy singleton.
export const bot = {
  get instance(): Bot {
    return getBot();
  },
};
