// WishlistItem loader: labor_wishlist_items -> Prisma WishlistItem.
//
// Source columns:
//   labor_wishlist_items: spree_product_id, spree_user_id
//
// Idempotent: upsert by composite unique (userId, productId). Skips rows whose
// user or product was not migrated.

import { db } from "@/lib/db";
import { query } from "../source";

interface WishlistRow {
  spree_product_id: string;
  spree_user_id: string;
}

export async function loadWishlist(
  productOldIdToNewId: Map<number, number>,
  userOldIdToNewId: Map<number, number>,
): Promise<void> {
  const rows = await query<WishlistRow>(
    `SELECT spree_product_id, spree_user_id
       FROM labor_wishlist_items
      ORDER BY id`,
  );

  let written = 0;
  let skipped = 0;

  for (const r of rows) {
    const productId = productOldIdToNewId.get(Number(r.spree_product_id));
    const userId = userOldIdToNewId.get(Number(r.spree_user_id));
    if (productId === undefined || userId === undefined) {
      skipped += 1;
      continue;
    }

    await db.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    written += 1;
  }

  console.log(`[wishlist] upserted ${written}, skipped ${skipped}`);
}
