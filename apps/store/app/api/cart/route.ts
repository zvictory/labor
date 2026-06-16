// JSON cart API for the client islands (add-to-cart button, mini-cart, header
// badge). All handlers operate on the caller's guest cart (resolved from the
// `labor_cart` cookie; created + cookie-set on first write).
//
//   GET    /api/cart            → current CartDTO
//   POST   /api/cart            → add item   { productId, isSample?, quantity? }
//   PATCH  /api/cart            → set qty     { itemId, quantity }
//   DELETE /api/cart            → remove line { itemId }   (or ?itemId=)
//
// Locale for resolved line names comes from ?locale=, else Accept-Language,
// else ru.

import { NextRequest, NextResponse } from 'next/server';

import { locales, defaultLocale, type Locale } from '@/i18n/config';
import { getCart, addItem, updateItem, removeItem, type CartDTO } from '@/lib/cart/cart';

const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

const resolveLocale = (req: NextRequest): Locale => {
  const param = req.nextUrl.searchParams.get('locale');
  if (param && isLocale(param)) {
    return param;
  }
  const header = req.headers.get('accept-language');
  if (header) {
    const first = header.split(',')[0]?.split('-')[0]?.trim().toLowerCase() ?? '';
    if (isLocale(first)) {
      return first;
    }
  }
  return defaultLocale;
};

const json = (cart: CartDTO): NextResponse => NextResponse.json(cart);

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cart = await getCart(resolveLocale(req));
  return json(cart);
}

interface PostBody {
  productId?: number;
  isSample?: boolean;
  quantity?: number;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.productId !== 'number') {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 });
  }

  await addItem(body.productId, {
    ...(typeof body.isSample === 'boolean' ? { isSample: body.isSample } : {}),
    ...(typeof body.quantity === 'number' ? { quantity: body.quantity } : {}),
  });
  return json(await getCart(resolveLocale(req)));
}

interface PatchBody {
  itemId?: number;
  quantity?: number;
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.itemId !== 'number' || typeof body.quantity !== 'number') {
    return NextResponse.json({ error: 'itemId and quantity are required' }, { status: 400 });
  }

  await updateItem(body.itemId, body.quantity);
  return json(await getCart(resolveLocale(req)));
}

interface DeleteBody {
  itemId?: number;
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  let itemId: number | undefined;

  const param = req.nextUrl.searchParams.get('itemId');
  if (param !== null) {
    const parsed = Number(param);
    if (Number.isInteger(parsed)) {
      itemId = parsed;
    }
  } else {
    try {
      const body = (await req.json()) as DeleteBody;
      if (typeof body.itemId === 'number') {
        itemId = body.itemId;
      }
    } catch {
      // fall through to validation below
    }
  }

  if (typeof itemId !== 'number') {
    return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
  }

  await removeItem(itemId);
  return json(await getCart(resolveLocale(req)));
}
