import 'dotenv/config';

const required = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env: ${key}`);
  return v;
};

const requiredMinLength = (key: string, min: number): string => {
  const v = required(key);
  if (v.length < min) throw new Error(`Env ${key} must be at least ${min} chars (got ${v.length})`);
  return v;
};

export const config = {
  botToken: required('TELEGRAM_BOT_TOKEN'),
  webappUrl: process.env.TELEGRAM_WEBAPP_URL ?? 'https://labor.uz/ru/tg',
  apiBaseUrl: process.env.LABOR_API_BASE_URL ?? 'http://backend:3000/api/v2',
  adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
  defaultLocale: (process.env.DEFAULT_LOCALE ?? 'ru') as 'ru' | 'en' | 'uz' | 'uzc',
  channelUrl: process.env.TELEGRAM_CHANNEL_URL ?? 'https://t.me/labor_uz',
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
  // Fail-fast: both secrets are required at boot. Telegram webhook secret guards
  // grammy's webhookCallback; internal notify token is HMAC key for Spree → bot.
  webhookSecret: requiredMinLength('TELEGRAM_WEBHOOK_SECRET', 16),
  internalNotifyToken: requiredMinLength('INTERNAL_NOTIFY_TOKEN', 32),
  port: Number(process.env.PORT ?? 8080),
} as const;

export type Locale = typeof config.defaultLocale;
