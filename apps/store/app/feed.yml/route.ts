// The product feed in YML, for marketplaces and price aggregators:
// GET /feed.yml (ru) or /feed.yml?locale=uz. Public, like the storefront it
// mirrors; regenerated at most once an hour.

import { NextRequest, NextResponse } from 'next/server';

import { buildYml, loadFeedItems } from '@/lib/catalog/feed';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const param = req.nextUrl.searchParams.get('locale');
  const locale = param === 'uz' || param === 'en' ? param : 'ru';
  const items = await loadFeedItems(locale);
  return new NextResponse(buildYml(items, { siteUrl: SITE_URL, locale, date: new Date() }), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
