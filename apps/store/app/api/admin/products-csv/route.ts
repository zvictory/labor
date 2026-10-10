// Staff-only download of the catalogue as CSV, for uploading to a marketplace
// seller cabinet (Uzum Market imports from a spreadsheet). Same rows as /feed.yml.

import { NextRequest, NextResponse } from 'next/server';

import { requireStaff } from '@/lib/admin/guard';
import { buildCsv, loadFeedItems } from '@/lib/catalog/feed';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  await requireStaff();
  const param = req.nextUrl.searchParams.get('locale');
  const locale = param === 'uz' || param === 'en' ? param : 'ru';
  const items = await loadFeedItems(locale);
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(buildCsv(items, { siteUrl: SITE_URL, locale }), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="labor-products-${locale}-${day}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
