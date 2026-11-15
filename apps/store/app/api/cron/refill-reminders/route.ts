// Daily run of the refill reminders (lib/reminders/refill.ts), called by the
// server's crontab with `Authorization: Bearer $CRON_SECRET`. Answers with how
// many were due, sent and failed.

import { NextRequest, NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/reminders/cron-auth';
import { sendRefillReminders } from '@/lib/reminders/refill';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'no_bot' }, { status: 503 });
  }
  const result = await sendRefillReminders();
  console.info('[refill] run:', result);
  return NextResponse.json(result);
}
