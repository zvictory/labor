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
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { BOT_MESSAGES, toBotLocale, type BotLocale } from '@/lib/telegram/messages';

const generateCode = (): string => {
  const max = 10 ** 6;
  const n = Math.floor(Math.random() * max);
  return n.toString().padStart(6, '0');
};

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
    const match = ctx.match;
    if (match === 'login' || match?.startsWith('login')) {
      const tgId = ctx.from?.id;
      if (tgId && match.startsWith('login_')) {
        const sessionId = match.substring('login_'.length);
        if (sessionId) {
          const phoneKey = `pending:${tgId}`;
          await db.otpCode.deleteMany({ where: { phone: phoneKey } }).catch(() => null);
          await db.otpCode.create({
            data: {
              phone: phoneKey,
              codeHash: `pending_session:${sessionId}`,
              expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min TTL
            },
          });
        }
      }

      const promptText =
        locale === 'ru'
          ? 'Пожалуйста, поделитесь своим номером телефона, чтобы получить код подтверждения для входа:'
          : locale === 'uz'
          ? 'Kirish tasdiqlash kodini olish uchun telefon raqamingizni yuboring:'
          : 'Please share your phone number to receive the login verification code:';
      const btnText =
        locale === 'ru'
          ? '📱 Поделиться номером'
          : locale === 'uz'
          ? '📱 Raqamni yuborish'
          : '📱 Share Number';
      await ctx.reply(promptText, {
        reply_markup: {
          keyboard: [[{ text: btnText, request_contact: true }]],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      });
      return;
    }
    const startUrl = `${storeUrl()}/${locale}/tg`;
    const catalogUrl = `${storeUrl()}/${locale}/tg/catalog`;

    const kb = new InlineKeyboard()
      .webApp(
        locale === 'ru' ? '🛍️ Открыть магазин' : locale === 'uz' ? '🛍️ Do‘konni ochish' : '🛍️ Open Store',
        startUrl
      )
      .row()
      .webApp(
        locale === 'ru' ? '📖 Каталог' : locale === 'uz' ? '📖 Katalog' : '📖 Catalog',
        catalogUrl
      );

    await ctx.reply(BOT_MESSAGES[locale].start(storeUrl()), {
      reply_markup: kb,
    });
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

  bot.on('message:contact', async (ctx) => {
    const locale = await resolveLocale(ctx);
    const contact = ctx.message.contact;
    if (!contact || contact.user_id !== ctx.from?.id) {
      await ctx.reply(
        locale === 'ru'
          ? 'Ошибка: можно отправлять только свой собственный контакт.'
          : 'Error: you can only share your own contact.'
      );
      return;
    }

    const rawPhone = contact.phone_number;
    const normalized = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
    const tgId = BigInt(ctx.from.id);

    // Retrieve pending session ID if it exists
    const pendingRow = await db.otpCode.findFirst({
      where: {
        phone: `pending:${ctx.from.id}`,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    let sessionId = '';
    if (pendingRow) {
      const parts = pendingRow.codeHash.split(':');
      if (parts[0] === 'pending_session' && parts[1]) {
        sessionId = parts[1];
      }
      await db.otpCode.delete({ where: { id: pendingRow.id } }).catch(() => null);
    }

    // Link telegramId to phone
    let user = await db.user.findFirst({ where: { phone: normalized } });
    if (user) {
      await db.user.update({
        where: { id: user.id },
        data: { telegramId: tgId },
      });
    } else {
      await db.user.upsert({
        where: { telegramId: tgId },
        update: { phone: normalized },
        create: {
          telegramId: tgId,
          phone: normalized,
          email: `tg_${ctx.from.id}@labor.local`,
          role: 'customer',
        },
      });
    }

    // Generate, hash, and save code
    const code = generateCode();
    const hash = await bcrypt.hash(code, 10);
    const codeHash = sessionId ? `${sessionId}:${hash}` : hash;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await db.otpCode.create({
      data: {
        phone: normalized,
        codeHash,
        expiresAt,
      },
    });

    const replyText =
      locale === 'ru'
        ? `Ваш код подтверждения для входа: *${code}*\n\nВведите этот код на сайте.`
        : locale === 'uz'
        ? `Kirish tasdiqlash kodingiz: *${code}*\n\nUshbu kodni saytga kiriting.`
        : `Your login verification code is: *${code}*\n\nEnter this code on the website.`;

    await ctx.reply(replyText, { parse_mode: 'Markdown' });
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
