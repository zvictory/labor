// GET /api/wallet/google/save — the "Add to Google Wallet" button on the account
// page. Makes sure the member's card exists on Google's side and sends the
// browser to Google's save page with a signed link. Members only.

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { ensureAccount } from '@/lib/loyalty/loyalty';
import { googleSaveUrl } from '@/lib/wallet/google/sync';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const locale = ['ru', 'uz', 'en'].includes(req.nextUrl.searchParams.get('locale') ?? '')
    ? (req.nextUrl.searchParams.get('locale') as string)
    : 'ru';
  const back = new URL(`/${locale}/account`, req.nextUrl.origin);

  const user = await getCurrentUser();
  if (!user || user.role !== 'customer') {
    return NextResponse.redirect(new URL(`/${locale}/account/login`, req.nextUrl.origin));
  }
  try {
    const account = await ensureAccount(user.id);
    const url = await googleSaveUrl(account.id);
    if (!url) {
      back.searchParams.set('wallet', 'off');
      return NextResponse.redirect(back);
    }
    return NextResponse.redirect(url);
  } catch (err) {
    console.error('[wallet/google] save link failed:', err);
    back.searchParams.set('wallet', 'error');
    return NextResponse.redirect(back);
  }
}
