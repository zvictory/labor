// ProductSimilar loader: labor_product_similars -> Prisma ProductSimilar.
//
// Source columns:
//   labor_product_similars: spree_product_id, similar_spree_product_id, score, source
//   (score/source have no target columns in the draft schema -> dropped.)
//
// Both sides are products; resolve each through the product oldId->newId map.
// Skip a row if either side was dropped (deleted product) — a dangling FK would
// fail anyway.
//
// Idempotent: upsert by composite unique (productId, similarId).

import { db } from "@/lib/db";
import { query } from "../source";

interface ProductSimilarRow {
  spree_product_id: string;
  similar_spree_product_id: string;
}

export async function loadProductSimilars(
  productOldIdToNewId: Map<number, number>,
): Promise<void> {
  const rows = await query<ProductSimilarRow>(
    `SELECT spree_product_id, similar_spree_product_id
       FROM labor_product_similars
      ORDER BY id`,
  );

  let written = 0;
  let skipped = 0;

  for (const r of rows) {
    const productId = productOldIdToNewId.get(Number(r.spree_product_id));
    const similarId = productOldIdToNewId.get(Number(r.similar_spree_product_id));
    if (productId === undefined || similarId === undefined || productId === similarId) {
      skipped += 1;
      continue;
    }

    await db.productSimilar.upsert({
      where: { productId_similarId: { productId, similarId } },
      create: { productId, similarId },
      update: {},
    });
    written += 1;
  }

  console.log(`[productSimilars] upserted ${written}, skipped ${skipped}`);
}
