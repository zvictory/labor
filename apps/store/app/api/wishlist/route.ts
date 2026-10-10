// JSON wishlist API for the heart buttons and the /wishlist page.
//
//   GET    /api/wishlist   → { ids: number[] } signed in, { ids: null } for a guest
//   POST   /api/wishlist   → save      { productId }      → { ids }
//   DELETE /api/wishlist   → unsave    { productId }      → { ids }
//   PUT    /api/wishlist   → merge     { productIds }     → { ids }  (guest list on sign-in)
//
// Guests get `ids: null` and keep their list in the browser; every write needs
// a session.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUserId } from '@/lib/auth/session';
import {
  addToWishlist,
  getWishlistIds,
  mergeIntoWishlist,
  productIdSchema,
  productIdsSchema,
  removeFromWishlist,
} from '@/lib/wishlist/wishlist';

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };

const readJson = async <T>(req: NextRequest, schema: z.ZodType<T>): Promise<T | null> => {
  try {
    const parsed = schema.safeParse(await req.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const unauthorized = () => NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
const badRequest = () => NextResponse.json({ error: 'bad_request' }, { status: 400 });

export async function GET(): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  return NextResponse.json({ ids: userId ? await getWishlistIds(userId) : null }, noStore);
}

const oneSchema = z.object({ productId: productIdSchema });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  const body = await readJson(req, oneSchema);
  if (!body) return badRequest();
  await addToWishlist(userId, body.productId);
  return NextResponse.json({ ids: await getWishlistIds(userId) }, noStore);
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  const body = await readJson(req, oneSchema);
  if (!body) return badRequest();
  await removeFromWishlist(userId, body.productId);
  return NextResponse.json({ ids: await getWishlistIds(userId) }, noStore);
}

const manySchema = z.object({ productIds: productIdsSchema });

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  const body = await readJson(req, manySchema);
  if (!body) return badRequest();
  return NextResponse.json({ ids: await mergeIntoWishlist(userId, body.productIds) }, noStore);
}
