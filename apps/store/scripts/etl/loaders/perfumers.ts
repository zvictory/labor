// Perfumer loader: labor_perfumers (+ labor_perfumer_translations) -> Prisma Perfumer.
//
// Source columns:
//   labor_perfumers: id, slug, name, country
//   labor_perfumer_translations: labor_perfumer_id, locale, bio
//
// Notes:
//   - `name` lives on the base table only (not translated) -> Perfumer.name (String).
//   - `bio` is translated only -> optional per-locale JSON.
//
// Idempotent: upsert by `slug`. Returns slug->newId map.

import { db } from "@/lib/db";
import { collapseLocaleJson, fetchTranslations, query } from "../source";

interface PerfumerRow {
  id: string;
  slug: string;
  name: string;
  country: string | null;
}

export async function loadPerfumers(): Promise<Map<string, number>> {
  const perfumers = await query<PerfumerRow>(
    `SELECT id, slug, name, country
       FROM labor_perfumers
      ORDER BY id`,
  );

  const ids = perfumers.map((p) => Number(p.id));
  const bios = await fetchTranslations(
    "labor_perfumer_translations",
    "labor_perfumer_id",
    "bio",
    ids,
  );

  const slugToId = new Map<string, number>();

  for (const p of perfumers) {
    const id = Number(p.id);
    const bio = collapseLocaleJson(null, bios.get(id) ?? []);

    const data = { name: p.name, country: p.country, bio: bio ? JSON.stringify(bio) : undefined };

    const saved = await db.perfumer.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
      select: { id: true },
    });
    slugToId.set(p.slug, saved.id);
  }

  console.log(`[perfumers] upserted ${slugToId.size} perfumers`);
  return slugToId;
}
