// FragranceDetail loader: labor_product_fragrance_details -> Prisma FragranceDetail.
//
// Source columns:
//   labor_product_fragrance_details:
//     spree_product_id, labor_brand_id, gender, concentration, release_year,
//     avg_rating, avg_longevity, avg_sillage, reviews_count, discontinued,
//     love_breakdown (jsonb), seasons_breakdown (jsonb), time_breakdown (jsonb)
//   (also volume_ml, votes_count in source — no target columns, skipped.)
//
// Mapping:
//   - spree_product_id -> productId (via product oldId map). Unique 1:1.
//   - labor_brand_id   -> brandId   (via old brand id map). Nullable.
//   - decimals (avg_*) pass through as strings (Prisma Decimal accepts string).
//   - *_breakdown jsonb pass through as objects.
//
// Idempotent: upsert by unique productId. Skips rows whose product was dropped
// (deleted_at) and therefore isn't in the product map.

import { db } from "@/lib/db";
import { query } from "../source";

interface FragranceRow {
  spree_product_id: string;
  labor_brand_id: string | null;
  gender: string;
  concentration: string | null;
  release_year: number | null;
  avg_rating: string;
  avg_longevity: string;
  avg_sillage: string;
  reviews_count: number;
  discontinued: boolean;
  love_breakdown: unknown;
  seasons_breakdown: unknown;
  time_breakdown: unknown;
}

/**
 * @param productOldIdToNewId old spree_products.id -> new Product.id
 * @param brandOldIdToNewId   old labor_brands.id  -> new Brand.id
 */
export async function loadFragranceDetails(
  productOldIdToNewId: Map<number, number>,
  brandOldIdToNewId: Map<number, number>,
): Promise<void> {
  const rows = await query<FragranceRow>(
    `SELECT spree_product_id, labor_brand_id, gender, concentration, release_year,
            avg_rating, avg_longevity, avg_sillage, reviews_count, discontinued,
            love_breakdown, seasons_breakdown, time_breakdown
       FROM labor_product_fragrance_details
      ORDER BY id`,
  );

  let written = 0;
  let skipped = 0;

  for (const r of rows) {
    const productId = productOldIdToNewId.get(Number(r.spree_product_id));
    if (productId === undefined) {
      skipped += 1; // product was deleted_at / not migrated
      continue;
    }
    const brandId =
      r.labor_brand_id === null
        ? null
        : (brandOldIdToNewId.get(Number(r.labor_brand_id)) ?? null);

    const data = {
      brandId,
      gender: r.gender,
      concentration: r.concentration,
      releaseYear: r.release_year,
      avgRating: parseFloat(r.avg_rating) || 0,
      avgLongevity: parseFloat(r.avg_longevity) || 0,
      avgSillage: parseFloat(r.avg_sillage) || 0,
      reviewsCount: r.reviews_count,
      discontinued: r.discontinued,
      loveBreakdown: JSON.stringify(r.love_breakdown ?? {}),
      seasonsBreakdown: JSON.stringify(r.seasons_breakdown ?? {}),
      timeBreakdown: JSON.stringify(r.time_breakdown ?? {}),
    };

    await db.fragranceDetail.upsert({
      where: { productId },
      create: { productId, ...data },
      update: data,
    });
    written += 1;
  }

  console.log(`[fragranceDetails] upserted ${written}, skipped ${skipped} (no product)`);
}
