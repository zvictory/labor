import { Bot, session, webhookCallback } from 'grammy';
import { run } from '@grammyjs/runner';
import { createServer } from 'node:http';
import { config } from './config.js';
import { initialSession, type LaborContext } from './middleware/session.js';
import { handleStart, handleHelp } from './handlers/start.js';
import { handleLangChoose, handleLangSet } from './handlers/lang.js';
import {
  notifyPaid,
  notifyShipped,
  notifyDelivered,
  notifyChannel,
  type ChannelPayload,
  type OrderPayload,
} from './handlers/notify.js';
import { t, type LocaleKey } from './i18n.js';
import { logger } from './logger.js';
import { verifyInternalNotifySignature } from './internalNotifyAuth.js';

if (/^placeholder|^changeme/i.test(config.botToken)) {
  logger.warn('TELEGRAM_BOT_TOKEN is a placeholder — bot disabled until configured');
  process.exit(0);
}

const readRawBody = async (req: import('node:http').IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
};

const bot = new Bot<LaborContext>(config.botToken);

bot.use(session({ initial: initialSession }));

bot.command('start', handleStart);
bot.command('help', handleHelp);
bot.command('lang', handleLangChoose);

bot.callbackQuery('help', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(t(ctx.session.locale, 'help.text'), { parse_mode: 'Markdown' });
});

bot.callbackQuery('lang:choose', async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleLangChoose(ctx);
});

bot.callbackQuery(/^lang:set:(ru|en|uz|uzc)$/, async (ctx) => {
  const code = ctx.match[1] as LocaleKey;
  await handleLangSet(ctx, code);
});

bot.on('message:text', async (ctx) => {
  await ctx.reply(t(ctx.session.locale, 'unknown'));
});

bot.catch((err) => logger.error({ err }, 'bot error'));

// Internal HTTP server for Spree → bot notifications + Telegram webhook.
const httpServer = createServer(async (req, res) => {
  try {
    if (!req.url) return res.end();

    if (req.url.startsWith('/internal/notify/')) {
      const rawBody = await readRawBody(req);
      const tsHeader = req.headers['x-notify-timestamp'];
      const sigHeader = req.headers['x-notify-signature'];
      const ts = Array.isArray(tsHeader) ? tsHeader[0] : tsHeader;
      const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
      if (!verifyInternalNotifySignature(ts, sig, rawBody, config.internalNotifyToken)) {
        res.writeHead(401).end('unauthorized');
        return;
      }
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        res.writeHead(400).end('bad json');
        return;
      }
      const event = req.url.split('/').pop() ?? '';
      if (event === 'paid')           await notifyPaid(bot, body as unknown as OrderPayload);
      else if (event === 'shipped')   await notifyShipped(bot, body as unknown as OrderPayload);
      else if (event === 'delivered') await notifyDelivered(bot, body as unknown as OrderPayload);
      else if (event === 'channel') {
        const result = await notifyChannel(bot, body as ChannelPayload);
        const status = result.ok ? 200 : 502;
        res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(result));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true }));
      return;
    }

    if (config.webhookUrl && req.url === '/telegram/webhook') {
      return webhookCallback(bot, 'http', { secretToken: config.webhookSecret })(req, res);
    }

    res.writeHead(404).end('not found');
  } catch (err) {
    logger.error({ err, url: req.url }, 'http handler failed');
    res.writeHead(500).end('error');
  }
});

httpServer.listen(config.port, () => logger.info({ port: config.port }, 'http listening'));

if (config.botToken.startsWith('mock_')) {
  logger.info('Running in mock mode (no polling or webhook registration with Telegram API)');
} else if (config.webhookUrl) {
  await bot.api.setWebhook(config.webhookUrl, { secret_token: config.webhookSecret });
  logger.info({ url: config.webhookUrl }, 'webhook registered');
} else {
  logger.info('starting long polling');
  run(bot);
}
