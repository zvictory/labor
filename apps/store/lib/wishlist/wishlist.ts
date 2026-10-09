// Saved products for signed-in customers (WishlistItem). Guests keep theirs in
// the browser (components/wishlist/wishlist-store.ts) until they sign in, when
// the client hands them over through mergeIntoWishlist.

import { z } from 'zod';

import { db } from '@/lib/db';

/** More than anyone saves by hand; bounds the merge a client can ask for. */
export const WISHLIST_LIMIT = 200;

export const productIdSchema = z.number().int().positive();
export const productIdsSchema = z.array(productIdSchema).max(WISHLIST_LIMIT);

/** Saved product ids, most recent first. */
export const getWishlistIds = async (userId: number): Promise<number[]> => {
  const rows = await db.wishlistItem.findMany({
    where: { userId, product: { status: 'active' } },
    orderBy: { createdAt: 'desc' },
    select: { productId: true },
    take: WISHLIST_LIMIT,
  });
  return rows.map((r) => r.productId);
};

/** Only ids of products that exist and are on sale can be saved. */
const activeIds = async (ids: readonly number[]): Promise<number[]> => {
  if (ids.length === 0) return [];
  const rows = await db.product.findMany({
    where: { id: { in: [...ids] }, status: 'active' },
    select: { id: true },
  });
  const ok = new Set(rows.map((r) => r.id));
  return ids.filter((id) => ok.has(id));
};

export const addToWishlist = async (userId: number, productId: number): Promise<void> => {
  const [id] = await activeIds([productId]);
  if (id === undefined) return;
  await db.wishlistItem.upsert({
    where: { userId_productId: { userId, productId: id } },
    create: { userId, productId: id },
    update: {},
  });
};

export const removeFromWishlist = async (userId: number, productId: number): Promise<void> => {
  await db.wishlistItem.deleteMany({ where: { userId, productId } });
};

/** Fold a guest's browser list into the account; returns the merged ids. */
export const mergeIntoWishlist = async (
  userId: number,
  productIds: readonly number[],
): Promise<number[]> => {
  const ids = await activeIds([...new Set(productIds)]);
  if (ids.length > 0) {
    await db.wishlistItem.createMany({
      data: ids.map((productId) => ({ userId, productId })),
      skipDuplicates: true,
    });
  }
  return getWishlistIds(userId);
};
