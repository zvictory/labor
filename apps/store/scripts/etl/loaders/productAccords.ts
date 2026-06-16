// ProductAccord loader: labor_product_accords -> Prisma ProductAccord.
//
// Source columns:
//   labor_product_accords: spree_product_id, labor_accord_id, weight
//
// Joins labor_accords for the slug -> resolve new accord id via slug map.
//
// Idempotent: upsert by composite unique (productId, accordId).

import { db } from "@/lib/db";
import { query } from "../source";

interface ProductAccordRow {
  spree_product_id: string;
  accord_slug: string;
  weight: number;
}

export async function loadProductAccords(
  productOldIdToNewId: Map<number, number>,
  accordSlugToId: Map<string, number>,
): Promise<void> {
  const rows = await query<ProductAccordRow>(
    `SELECT pa.spree_product_id AS spree_product_id,
            a.slug              AS accord_slug,
            pa.weight           AS weight
       FROM labor_product_accords pa
       JOIN labor_accords a ON a.id = pa.labor_accord_id
      ORDER BY pa.id`,
  );

  let written = 0;
  let skipped = 0;

  for (const r of rows) {
    const productId = productOldIdToNewId.get(Number(r.spree_product_id));
    const accordId = accordSlugToId.get(r.accord_slug);
    if (productId === undefined || accordId === undefined) {
      skipped += 1;
      continue;
    }

    const data = { weight: r.weight };

    await db.productAccord.upsert({
      where: { productId_accordId: { productId, accordId } },
      create: { productId, accordId, ...data },
      update: data,
    });
    written += 1;
  }

  console.log(`[productAccords] upserted ${written}, skipped ${skipped}`);
}
