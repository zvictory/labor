import { InlineKeyboard } from 'grammy';
import { t, type LocaleKey } from '../i18n.js';
import { api } from '../services/api.js';
import type { LaborContext } from '../middleware/session.js';
import { logger } from '../logger.js';

const LANGS: { code: LocaleKey; label: string }[] = [
  { code: 'ru', label: '🇷🇺 Русский' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'uz', label: '🇺🇿 Oʻzbek' },
  { code: 'uzc', label: '🇺🇿 Ўзбек' },
];

export const handleLangChoose = async (ctx: LaborContext): Promise<void> => {
  const kb = new InlineKeyboard();
  for (const { code, label } of LANGS) kb.text(label, `lang:set:${code}`).row();
  await ctx.editMessageText(t(ctx.session.locale, 'lang.choose'), { reply_markup: kb }).catch(() =>
    ctx.reply(t(ctx.session.locale, 'lang.choose'), { reply_markup: kb }),
  );
};

export const handleLangSet = async (ctx: LaborContext, code: LocaleKey): Promise<void> => {
  ctx.session.locale = code;
  const label = LANGS.find((l) => l.code === code)?.label ?? code;

  if (ctx.from?.id) {
    try {
      await api.saveLocale(ctx.from.id, code);
    } catch (err) {
      logger.warn({ err }, 'failed to persist locale');
    }
  }

  await ctx.answerCallbackQuery(t(code, 'lang.set', { lang: label }));
  await ctx.editMessageText(t(code, 'lang.set', { lang: label }));
};
