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

import { db } from '@/lib/db';
import { query } from '../source';

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

  let skipped = 0;
  const memberships = new Map<
    string,
    {
      productId: number;
      noteId: number;
      pyramidLayer: string;
      position: number;
    }
  >();

  for (const r of rows) {
    const productId = productOldIdToNewId.get(Number(r.spree_product_id));
    const noteId = noteSlugToId.get(r.note_slug);
    if (productId === undefined || noteId === undefined) {
      skipped += 1;
      continue;
    }

    // Preserve stored source layer spelling; changing heart to middle would
    // insert parallel rows into a previously imported catalogue.
    const pyramidLayer = r.pyramid_layer;
    const key = `${productId}:${noteId}:${pyramidLayer}`;
    const existing = memberships.get(key);
    if (!existing || r.position < existing.position) {
      memberships.set(key, { productId, noteId, pyramidLayer, position: r.position });
    }
  }

  // Aliases may share one destination key: choose the earliest position before
  // writing so source order and repeated imports cannot change the scent order.
  for (const { productId, noteId, pyramidLayer, position } of memberships.values()) {
    const data = { position };
    await db.productNote.upsert({
      where: {
        productId_noteId_pyramidLayer: {
          productId,
          noteId,
          pyramidLayer,
        },
      },
      create: { productId, noteId, pyramidLayer, ...data },
      update: data,
    });
  }

  console.log(`[productNotes] upserted ${memberships.size}, skipped ${skipped}`);
}
