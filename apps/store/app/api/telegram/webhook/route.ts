// POST /api/telegram/webhook — inbound Telegram update receiver.
//
// Telegram sends the configured secret in the `X-Telegram-Bot-Api-Secret-Token`
// header (set when registering the webhook). We validate it constant-time, then
// dispatch the Update to the grammy bot. We always 200 quickly so Telegram does
// not retry; handler errors are swallowed (logged) rather than surfaced.

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getBot } from '@/lib/telegram/bot';

const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';

function secretMatches(provided: string | null): boolean {
  if (!SECRET || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(SECRET);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!secretMatches(req.headers.get('x-telegram-bot-api-secret-token'))) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const update = await req.json().catch(() => null);
  if (!update) {
    // Malformed body — ack so Telegram doesn't retry a poison update.
    return NextResponse.json({ ok: true });
  }

  try {
    const bot = getBot();
    let hasBotInfo = false;
    try {
      hasBotInfo = !!bot.botInfo;
    } catch {
      hasBotInfo = false;
    }
    if (!hasBotInfo) {
      await bot.init();
    }
    await bot.handleUpdate(update);
  } catch (err) {
    // Never let a handler failure turn into a non-200 (Telegram would retry).
    console.error('[telegram/webhook] handleUpdate failed:', err);
  }

  return NextResponse.json({ ok: true });
}
