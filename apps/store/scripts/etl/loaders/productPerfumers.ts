// ProductPerfumer loader: labor_product_perfumers -> Prisma ProductPerfumer.
//
// Source columns:
//   labor_product_perfumers: spree_product_id, labor_perfumer_id
//
// Joins labor_perfumers for the slug -> resolve new perfumer id via slug map.
//
// Idempotent: upsert by composite unique (productId, perfumerId).

import { db } from "@/lib/db";
import { query } from "../source";

interface ProductPerfumerRow {
  spree_product_id: string;
  perfumer_slug: string;
}

export async function loadProductPerfumers(
  productOldIdToNewId: Map<number, number>,
  perfumerSlugToId: Map<string, number>,
): Promise<void> {
  const rows = await query<ProductPerfumerRow>(
    `SELECT pp.spree_product_id AS spree_product_id,
            p.slug              AS perfumer_slug
       FROM labor_product_perfumers pp
       JOIN labor_perfumers p ON p.id = pp.labor_perfumer_id
      ORDER BY pp.id`,
  );

  let written = 0;
  let skipped = 0;

  for (const r of rows) {
    const productId = productOldIdToNewId.get(Number(r.spree_product_id));
    const perfumerId = perfumerSlugToId.get(r.perfumer_slug);
    if (productId === undefined || perfumerId === undefined) {
      skipped += 1;
      continue;
    }

    await db.productPerfumer.upsert({
      where: { productId_perfumerId: { productId, perfumerId } },
      create: { productId, perfumerId },
      update: {},
    });
    written += 1;
  }

  console.log(`[productPerfumers] upserted ${written}, skipped ${skipped}`);
}
