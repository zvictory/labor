// Vote loader: labor_votes -> Prisma Vote.
//
// Source columns:
//   labor_votes: spree_product_id, spree_user_id, rating, longevity, sillage,
//                love_level, seasons (jsonb array), time_of_day (jsonb array)
//
// Mapping:
//   - spree_user_id    -> userId    (user oldId->newId map)
//   - spree_product_id -> productId (product oldId->newId map)
//   - love_level       -> loveLevel
//   - seasons          -> seasons   (Json, default [])
//   - time_of_day      -> timeOfDay (Json, default [])
//
// Idempotent: upsert by composite unique (userId, productId). Skips rows whose
// user or product was not migrated.

import { db } from "@/lib/db";
import { query } from "../source";

interface VoteRow {
  spree_product_id: string;
  spree_user_id: string;
  rating: number | null;
  longevity: number | null;
  sillage: number | null;
  love_level: string | null;
  seasons: unknown;
  time_of_day: unknown;
}

export async function loadVotes(
  productOldIdToNewId: Map<number, number>,
  userOldIdToNewId: Map<number, number>,
): Promise<void> {
  const rows = await query<VoteRow>(
    `SELECT spree_product_id, spree_user_id, rating, longevity, sillage,
            love_level, seasons, time_of_day
       FROM labor_votes
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

    const data = {
      rating: r.rating,
      longevity: r.longevity,
      sillage: r.sillage,
      loveLevel: r.love_level,
      seasons: JSON.stringify(r.seasons ?? []),
      timeOfDay: JSON.stringify(r.time_of_day ?? []),
    };

    await db.vote.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, ...data },
      update: data,
    });
    written += 1;
  }

  console.log(`[votes] upserted ${written}, skipped ${skipped}`);
}
