// Points the Telegram bot's webhook at the store: <site>/api/telegram/webhook,
// with TELEGRAM_WEBHOOK_SECRET as the secret Telegram sends back on every update.
//
// The deploy runs it inside the store container after each release
// (infra/deploy/deploy.sh), so the webhook can never be left on an address
// nothing answers. It changes nothing when the webhook is already right, and
// it never prints the token.
//
//   node scripts/telegram-webhook.mjs
//
// Plain JavaScript on purpose: the production image has node but neither tsx
// nor the TypeScript sources.

const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
const origin = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  'https://laborparfum.com'
).replace(/\/+$/, '');
const url = `${origin}/api/telegram/webhook`;

if (!token || token.startsWith('mock_') || token.startsWith('REPLACE_ME')) {
  console.log('--> Telegram webhook: no bot token, skipped');
  process.exit(0);
}
// The store's route refuses every update that does not carry this secret, so a
// webhook without it would silently drop all of them.
if (secret.length < 16) {
  console.error('--> Telegram webhook: TELEGRAM_WEBHOOK_SECRET is missing or shorter than 16 characters');
  process.exit(1);
}

const call = async (method, body) => {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) throw new Error(`${method}: ${json.description ?? `HTTP ${res.status}`}`);
  return json.result;
};

try {
  const info = await call('getWebhookInfo');
  if (info.url === url) {
    // Telegram does not report the secret, so set it again whenever the
    // last delivery failed: a changed secret shows up as 403s there.
    if (!info.last_error_message) {
      console.log(`--> Telegram webhook: already ${url}`);
      process.exit(0);
    }
  }
  await call('setWebhook', { url, secret_token: secret });
  console.log(`--> Telegram webhook: ${info.url || '(none)'} -> ${url}`);
} catch (err) {
  console.error(`--> Telegram webhook: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
