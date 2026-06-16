// POST /api/telegram/webhook — inbound Telegram update receiver (STUB).
//
// Telegram sends the configured secret in the `X-Telegram-Bot-Api-Secret-Token`
// header (set when registering the webhook). We validate it constant-time and
// 200 immediately so Telegram doesn't retry. Full bot dispatch (grammy handlers,
// order notifications, mini-app auth) lands in a later phase.
//
// TODO(P5): wire the grammy bot — parse the Update, route to handlers
// (start/help/lang, order status), and reply. Keep this endpoint fast (ack
// within Telegram's timeout) and push heavy work to a queue.

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

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

  // Drain the body so the connection closes cleanly; ignore contents for now.
  await req.json().catch(() => null);

  // TODO(P5): dispatch the update to the grammy bot.
  return NextResponse.json({ ok: true });
}
