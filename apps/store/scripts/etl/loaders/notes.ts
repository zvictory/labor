// Note loader: labor_notes (+ labor_note_translations) -> Prisma Note.
//
// Source columns:
//   labor_notes: id, slug, name, family, icon_url
//   labor_note_translations: labor_note_id, locale, name, description
//
// Notes:
//   - `name` exists on BOTH the base table (default locale) and translations.
//     Base `name` seeds the `ru` fallback; translation rows override per locale.
//   - `description` is translated only.
//   - Note.name is REQUIRED JSON -> use collapseRequiredLocaleJson (slug fallback).
//
// Idempotent: upsert by `slug`. Returns slug->newId map.

import { db } from "@/lib/db";
import {
  collapseLocaleJson,
  collapseRequiredLocaleJson,
  fetchTranslations,
  query,
} from "../source";

interface NoteRow {
  id: string;
  slug: string;
  name: string | null;
  family: string | null;
  icon_url: string | null;
}

export async function loadNotes(): Promise<Map<string, number>> {
  const notes = await query<NoteRow>(
    `SELECT id, slug, name, family, icon_url
       FROM labor_notes
      ORDER BY id`,
  );

  const ids = notes.map((n) => Number(n.id));
  const names = await fetchTranslations("labor_note_translations", "labor_note_id", "name", ids);
  const descriptions = await fetchTranslations(
    "labor_note_translations",
    "labor_note_id",
    "description",
    ids,
  );

  const slugToId = new Map<string, number>();

  for (const n of notes) {
    const id = Number(n.id);
    const name = collapseRequiredLocaleJson(n.name, names.get(id) ?? [], n.slug);
    const description = collapseLocaleJson(null, descriptions.get(id) ?? []);

    const data = {
      name,
      description: description ?? undefined,
      family: n.family,
      iconUrl: n.icon_url,
    };

    const saved = await db.note.upsert({
      where: { slug: n.slug },
      create: { slug: n.slug, ...data },
      update: data,
      select: { id: true },
    });
    slugToId.set(n.slug, saved.id);
  }

  console.log(`[notes] upserted ${slugToId.size} notes`);
  return slugToId;
}
