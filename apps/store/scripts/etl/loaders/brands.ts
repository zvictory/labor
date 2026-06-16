// Brand loader: labor_brands (+ labor_brand_translations) -> Prisma Brand.
//
// Source columns (verified against apps/backend/db/schema.rb):
//   labor_brands: id, slug, name, country, founded_year, niche, website, active
//   labor_brand_translations: labor_brand_id, locale, description, story
//
// Notes:
//   - `name` lives on the base table only (not translated) -> Brand.name (String).
//   - `description` and `story` are translated -> per-locale JSON.
//   - No logo_url in Spree -> Brand.logoUrl left null (schema default).
//   - `active` has no target column; we still migrate inactive brands (catalog
//     completeness) — visibility is a storefront concern, not an ETL one.
//
// Idempotent: upsert by unique `slug`. Returns a slug->newId map for downstream FKs.

import { db } from "@/lib/db";
import { collapseLocaleJson, fetchTranslations, query } from "../source";

interface BrandRow {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  founded_year: number | null;
  niche: boolean;
  website: string | null;
}

export async function loadBrands(): Promise<Map<string, number>> {
  const brands = await query<BrandRow>(
    `SELECT id, slug, name, country, founded_year, niche, website
       FROM labor_brands
      ORDER BY id`,
  );

  const ids = brands.map((b) => Number(b.id));
  const descriptions = await fetchTranslations(
    "labor_brand_translations",
    "labor_brand_id",
    "description",
    ids,
  );
  const stories = await fetchTranslations(
    "labor_brand_translations",
    "labor_brand_id",
    "story",
    ids,
  );

  const slugToId = new Map<string, number>();

  for (const b of brands) {
    const id = Number(b.id);
    const description = collapseLocaleJson(null, descriptions.get(id) ?? []);
    const story = collapseLocaleJson(null, stories.get(id) ?? []);

    const data = {
      name: b.name,
      description: description ?? undefined,
      story: story ?? undefined,
      country: b.country,
      foundedYear: b.founded_year,
      website: b.website,
      niche: b.niche,
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
  return slugToId;
}
