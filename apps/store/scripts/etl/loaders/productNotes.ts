// ProductNote loader: labor_product_notes -> Prisma ProductNote.
//
// Source columns:
//   labor_product_notes: spree_product_id, labor_note_id, pyramid_layer, position
//
// We join to labor_notes to get the note slug, so we can resolve the new note id
// via the slug map (avoids maintaining an old-note-id map). Product ids resolve
// via the product oldId->newId map.
//
// Idempotent: upsert by composite unique (productId, noteId, pyramidLayer).
// Skips rows whose product was dropped.

import { db } from "@/lib/db";
import { query } from "../source";

interface ProductNoteRow {
  spree_product_id: string;
  note_slug: string;
  pyramid_layer: string;
  position: number;
}

export async function loadProductNotes(
  productOldIdToNewId: Map<number, number>,
  noteSlugToId: Map<string, number>,
): Promise<void> {
  const rows = await query<ProductNoteRow>(
    `SELECT pn.spree_product_id AS spree_product_id,
            n.slug              AS note_slug,
            pn.pyramid_layer    AS pyramid_layer,
            pn.position         AS position
       FROM labor_product_notes pn
       JOIN labor_notes n ON n.id = pn.labor_note_id
      ORDER BY pn.id`,
  );

  let written = 0;
  let skipped = 0;

  for (const r of rows) {
    const productId = productOldIdToNewId.get(Number(r.spree_product_id));
    const noteId = noteSlugToId.get(r.note_slug);
    if (productId === undefined || noteId === undefined) {
      skipped += 1;
      continue;
    }

    const data = { position: r.position };

    await db.productNote.upsert({
      where: {
        productId_noteId_pyramidLayer: {
          productId,
          noteId,
          pyramidLayer: r.pyramid_layer,
        },
      },
      create: { productId, noteId, pyramidLayer: r.pyramid_layer, ...data },
      update: data,
    });
    written += 1;
  }

  console.log(`[productNotes] upserted ${written}, skipped ${skipped}`);
}
