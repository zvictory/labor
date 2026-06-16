// Accord loader: labor_accords (+ labor_accord_translations) -> Prisma Accord.
//
// Source columns:
//   labor_accords: id, slug, name, color_hex
//   labor_accord_translations: labor_accord_id, locale, name
//
// Notes:
//   - `name` on base (default locale) + translated rows -> required JSON.
//   - `color_hex` -> Accord.colorHex.
//
// Idempotent: upsert by `slug`. Returns slug->newId map.

import { db } from "@/lib/db";
import { collapseRequiredLocaleJson, fetchTranslations, query } from "../source";

interface AccordRow {
  id: string;
  slug: string;
  name: string | null;
  color_hex: string | null;
}

export async function loadAccords(): Promise<Map<string, number>> {
  const accords = await query<AccordRow>(
    `SELECT id, slug, name, color_hex
       FROM labor_accords
      ORDER BY id`,
  );

  const ids = accords.map((a) => Number(a.id));
  const names = await fetchTranslations(
    "labor_accord_translations",
    "labor_accord_id",
    "name",
    ids,
  );

  const slugToId = new Map<string, number>();

  for (const a of accords) {
    const id = Number(a.id);
    const name = collapseRequiredLocaleJson(a.name, names.get(id) ?? [], a.slug);

    const data = { name, colorHex: a.color_hex };

    const saved = await db.accord.upsert({
      where: { slug: a.slug },
      create: { slug: a.slug, ...data },
      update: data,
      select: { id: true },
    });
    slugToId.set(a.slug, saved.id);
  }

  console.log(`[accords] upserted ${slugToId.size} accords`);
  return slugToId;
}
