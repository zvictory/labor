// ETL orchestrator: Spree (read-only) -> Prisma (target).
//
// Run order respects FKs:
//   brands -> notes -> accords -> perfumers
//   -> products (+ prices baked in)
//   -> fragranceDetails
//   -> productNotes / productAccords / productPerfumers / productSimilars
//   -> images
//   -> users
//   -> votes / wishlist
//   -> campaigns
//   -> report
//
// Idempotent: every loader upserts by a natural key, so re-running converges.
// The pg pool is always closed in the finally block.
//
// Run:  tsx scripts/etl/index.ts
// Env:  SPREE_DATABASE_URL (source, read-only), DATABASE_URL (target),
//       MIGRATE_BLOBS (true|false), PUBLIC_HOST (legacy blob host).

import { db } from '@/lib/db';
import { closePool, query } from './source';
import { loadBrands } from './loaders/brands';
import { loadNotes } from './loaders/notes';
import { loadAccords } from './loaders/accords';
import { loadPerfumers } from './loaders/perfumers';
import { loadProducts } from './loaders/products';
import { loadFragranceDetails } from './loaders/fragranceDetails';
import { loadProductNotes } from './loaders/productNotes';
import { loadProductAccords } from './loaders/productAccords';
import { loadProductPerfumers } from './loaders/productPerfumers';
import { loadProductSimilars } from './loaders/productSimilars';
import { loadImages } from './loaders/images';
import { loadUsers } from './loaders/users';
import { loadVotes } from './loaders/votes';
import { loadWishlist } from './loaders/wishlist';
import { loadCampaigns } from './loaders/campaigns';
import { runReport } from './report';
import { reportTaxonomyMediaFailures, type TaxonomyMediaFailure } from './media';

/**
 * Build old labor_brands.id -> new Brand.id by combining the slug->newId map
 * (returned by loadBrands) with the source (id, slug) pairs. FragranceDetail
 * references brands by old integer id, so we need this translation.
 */
async function buildBrandOldIdMap(
  brandSlugToNewId: Map<string, number>,
): Promise<Map<number, number>> {
  const rows = await query<{ id: string; slug: string }>(`SELECT id, slug FROM labor_brands`);
  const map = new Map<number, number>();
  for (const r of rows) {
    const newId = brandSlugToNewId.get(r.slug);
    if (newId !== undefined) map.set(Number(r.id), newId);
  }
  return map;
}

async function main(): Promise<void> {
  console.log('=== Labor Parfum ETL: Spree -> Prisma ===');
  const startedAt = Date.now();

  try {
    const taxonomyMediaFailures: TaxonomyMediaFailure[] = [];

    // 1. Reference catalog entities.
    const brandSlugToId = await loadBrands(taxonomyMediaFailures);
    const noteSlugToId = await loadNotes(taxonomyMediaFailures);
    const accordSlugToId = await loadAccords();
    const perfumerSlugToId = await loadPerfumers();

    const brandOldIdToNewId = await buildBrandOldIdMap(brandSlugToId);

    // 2. Products (price baked in).
    const { oldIdToNewId: productOldIdToNewId } = await loadProducts();

    // 3. Product-scoped details + joins.
    await loadFragranceDetails(productOldIdToNewId, brandOldIdToNewId);
    await loadProductNotes(productOldIdToNewId, noteSlugToId);
    await loadProductAccords(productOldIdToNewId, accordSlugToId);
    await loadProductPerfumers(productOldIdToNewId, perfumerSlugToId);
    await loadProductSimilars(productOldIdToNewId);

    // 4. Images (re-runnable; behaviour gated by MIGRATE_BLOBS).
    await loadImages(productOldIdToNewId);

    // 5. Users, then engagement.
    const userOldIdToNewId = await loadUsers();
    await loadVotes(productOldIdToNewId, userOldIdToNewId);
    await loadWishlist(productOldIdToNewId, userOldIdToNewId);

    // 6. Marketing.
    await loadCampaigns(productOldIdToNewId);

    // 7. Verification report.
    await runReport();
    reportTaxonomyMediaFailures(taxonomyMediaFailures);

    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`\n=== ETL complete in ${seconds}s ===`);
  } finally {
    // Always release the read-only source pool and the Prisma client.
    await closePool();
    await db.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[etl] FAILED:', err);
    process.exit(1);
  });
