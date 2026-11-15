// Daily run of the loyalty programme (lib/loyalty/loyalty.ts): close expired
// bonus, give today's birthday bonuses, warn about bonus expiring within 14
// days. Called by the server's crontab with `Authorization: Bearer $CRON_SECRET`.
// The ledger is updated whether or not the bot is configured; only the
// messages need it.

import { NextRequest, NextResponse } from 'next/server';

import { runLoyaltyDay } from '@/lib/loyalty/loyalty';
import { sendDailyNotices } from '@/lib/loyalty/notify';
import { isCronAuthorized } from '@/lib/reminders/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const run = await runLoyaltyDay();
  const messages = await sendDailyNotices(run.notices);
  const result = {
    expiredLots: run.expiredLots,
    expiredAmount: run.expiredAmount,
    birthdays: run.birthdays,
    notices: run.notices.length,
    ...messages,
  };
  console.info('[loyalty] daily run:', result);
  return NextResponse.json(result);
}
