// Brand loader: labor_brands (+ labor_brand_translations) -> Prisma Brand.
//
// Source columns (verified against apps/backend/db/schema.rb):
//   labor_brands: id, slug, name, country, founded_year, niche, website, active
//   labor_brand_translations: labor_brand_id, locale, description, story
//
// Notes:
//   - `name` lives on the base table only (not translated) -> Brand.name (String).
//   - `description` and `story` are translated -> per-locale JSON.
//   - `active` has no target column; we still migrate inactive brands (catalog
//     completeness) — visibility is a storefront concern, not an ETL one.
//
// Idempotent: upsert by unique `slug`. Returns a slug->newId map for downstream FKs.

import { db } from '@/lib/db';
import {
  migrateTaxonomyMedia,
  reportTaxonomyMediaFailures,
  type TaxonomyMediaFailure,
} from '../media';
import { collapseLocaleJson, fetchTranslations, query } from '../source';

const MIGRATE_BLOBS = process.env.MIGRATE_BLOBS === 'true';

interface BrandRow {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  founded_year: number | null;
  niche: boolean;
  website: string | null;
  logo_url: string | null;
}

export async function loadBrands(
  mediaFailures?: TaxonomyMediaFailure[],
): Promise<Map<string, number>> {
  const brands = await query<BrandRow>(
    `SELECT id, slug, name, country, founded_year, niche, website, logo_url
       FROM labor_brands
      ORDER BY id`,
  );

  const ids = brands.map((b) => Number(b.id));
  const descriptions = await fetchTranslations(
    'labor_brand_translations',
    'labor_brand_id',
    'description',
    ids,
  );
  const stories = await fetchTranslations(
    'labor_brand_translations',
    'labor_brand_id',
    'story',
    ids,
  );

  const slugToId = new Map<string, number>();
  const failures = mediaFailures ?? [];

  for (const b of brands) {
    const id = Number(b.id);
    const description = collapseLocaleJson(null, descriptions.get(id) ?? []);
    const story = collapseLocaleJson(null, stories.get(id) ?? []);
    let logoUrl = b.logo_url;
    if (b.logo_url?.trim()) {
      try {
        logoUrl = await migrateTaxonomyMedia({
          kind: 'brands',
          slug: b.slug,
          sourceUrl: b.logo_url,
          migrateBlobs: MIGRATE_BLOBS,
        });
      } catch (error: unknown) {
        failures.push({
          kind: 'brands',
          slug: b.slug,
          url: b.logo_url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const data = {
      name: b.name,
      description: description ? JSON.stringify(description) : undefined,
      story: story ? JSON.stringify(story) : undefined,
      country: b.country,
      foundedYear: b.founded_year,
      website: b.website,
      niche: b.niche,
      logoUrl,
    };

    const saved = await db.brand.upsert({
      where: { slug: b.slug },
      create: { slug: b.slug, ...data },
      update: data,
      select: { id: true },
    });
    slugToId.set(b.slug, saved.id);
  }

  console.log(`[brands] upserted ${slugToId.size} brands`);
  if (!mediaFailures) reportTaxonomyMediaFailures(failures);
  return slugToId;
}
