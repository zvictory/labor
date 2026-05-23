import { InlineKeyboard } from 'grammy';
import { config } from '../config.js';
import { detectLocale, t } from '../i18n.js';
import type { LaborContext } from '../middleware/session.js';

export const handleStart = async (ctx: LaborContext): Promise<void> => {
  const detected = detectLocale(ctx.from?.language_code);
  ctx.session.locale = detected;

  const kb = new InlineKeyboard()
    .webApp(t(detected, 'menu.open'), config.webappUrl)
    .row()
    .webApp(t(detected, 'menu.catalog'), `${config.webappUrl}/catalog`)
    .webApp(t(detected, 'menu.cart'), `${config.webappUrl}/cart`)
    .row()
    .webApp(t(detected, 'menu.orders'), `${config.webappUrl}/orders`)
    .url(t(detected, 'menu.channel'), config.channelUrl)
    .row()
    .text(t(detected, 'menu.lang'), 'lang:choose')
    .text(t(detected, 'menu.help'), 'help');

  await ctx.reply(t(detected, 'start.welcome'), {
    parse_mode: 'Markdown',
    reply_markup: kb,
  });
};

export const handleHelp = async (ctx: LaborContext): Promise<void> => {
  await ctx.reply(t(ctx.session.locale, 'help.text'), { parse_mode: 'Markdown' });
};
