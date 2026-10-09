// Product cards for the /wishlist page: GET /api/wishlist/products?ids=3,1,2&locale=uz
// → { products: ProductCardDTO[] } in the order given. Public catalogue data, so
// it serves a guest's browser-held list and a signed-in list alike.

import { NextRequest, NextResponse } from 'next/server';

import { defaultLocale, locales } from '@/i18n/config';
import { listProductsByIds } from '@/lib/catalog/products';
import { WISHLIST_LIMIT } from '@/lib/wishlist/wishlist';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;
  const localeParam = sp.get('locale') ?? '';
  const locale = (locales as readonly string[]).includes(localeParam) ? localeParam : defaultLocale;

  const ids = (sp.get('ids') ?? '')
    .split(',')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, WISHLIST_LIMIT);

  return NextResponse.json({ products: await listProductsByIds([...new Set(ids)], locale) });
}
