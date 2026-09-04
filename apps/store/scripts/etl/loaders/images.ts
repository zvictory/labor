// ProductImage loader: Spree product images -> Prisma ProductImage.
//
// Spree image chain (verified against schema.rb):
//   spree_assets (viewable_type='Spree::Variant', viewable_id=variant.id,
//                 type='Spree::Image', alt, position)
//     -> spree_variants.product_id
//     -> active_storage_attachments (record_type='Spree::Asset',
//                                    record_id=asset.id, name='attachment')
//       -> active_storage_blobs (key, filename, content_type, byte_size, service_name)
//
// Behaviour is governed by env MIGRATE_BLOBS:
//   - MIGRATE_BLOBS=true : download each blob's bytes from the legacy Spree blob
//     host and re-upload to object storage via @/lib/storage.putObject(key, buffer,
//     contentType) -> store the returned URL. (putObject is provided by Agent 4.)
//   - else (default)     : construct a reference URL on the existing Spree blob
//     host (PUBLIC_HOST) and store that, deferring the byte copy.
//
// Re-runnable:
//   - The target URL is deterministic per blob key, so re-running converges.
//   - We upsert ProductImage by a stable natural key. ProductImage has no DB
//     unique constraint in the draft schema, so we emulate idempotency: per
//     product, delete existing images whose `url` is no longer present, then
//     create-if-missing by (productId, url). This makes the step safely repeatable.
//
// Object key: we reuse the ActiveStorage blob `key` as the storage object key so
// the same source blob always maps to the same destination object.

import { db } from '@/lib/db';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { query } from '../source';

const MIGRATE_BLOBS = process.env.MIGRATE_BLOBS === 'true';
// Host that already serves the legacy Spree ActiveStorage blobs (e.g. the Rails
// app or its disk/S3 service). Used to build reference URLs and, when migrating,
// to fetch the bytes.
const PUBLIC_HOST = (process.env.PUBLIC_HOST ?? '').replace(/\/+$/, '');
// Optional mount of the legacy Rails ActiveStorage disk service. During a local
// cutover this avoids relying on signed Rails URLs and copies the original bytes
// straight into object storage.
const SOURCE_STORAGE_DIR = process.env.SOURCE_STORAGE_DIR;

interface AssetImageRow {
  product_id: string;
  alt: string | null;
  position: number | null;
  blob_key: string;
  filename: string;
  content_type: string | null;
}

/**
 * Build the legacy reference URL for a blob. ActiveStorage's representational
 * route is /rails/active_storage/blobs/<...>, but the simplest stable reference
 * that works for the Disk and S3 services in this project is the blob key under a
 * predictable path on PUBLIC_HOST. Adjust the prefix here if the legacy service
 * exposes blobs elsewhere.
 */
function referenceUrl(blobKey: string, filename: string): string {
  const base = PUBLIC_HOST || '';
  return `${base}/storage/${blobKey}/${encodeURIComponent(filename)}`;
}

/**
 * Resolve the final object-storage URL for a blob, either by copying its bytes
 * (MIGRATE_BLOBS=true) or by referencing the existing host.
 *
 * The putObject import is lazy so that the reference-only path has no hard
 * dependency on @/lib/storage (which Agent 4 owns).
 */
async function resolveUrl(row: AssetImageRow): Promise<string> {
  if (!MIGRATE_BLOBS) {
    return referenceUrl(row.blob_key, row.filename);
  }

  const buffer = SOURCE_STORAGE_DIR
    ? await readFile(
        join(SOURCE_STORAGE_DIR, row.blob_key.slice(0, 2), row.blob_key.slice(2, 4), row.blob_key),
      )
    : await fetchBlob(row);
  const contentType = row.content_type ?? 'application/octet-stream';

  const { putObject } = await import('@/lib/storage');
  // Reuse the ActiveStorage key as the destination object key -> idempotent copy.
  return putObject(row.blob_key, buffer, contentType);
}

async function fetchBlob(row: AssetImageRow): Promise<Buffer> {
  const sourceUrl = referenceUrl(row.blob_key, row.filename);
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(
      `[images] failed to fetch blob ${row.blob_key} (${sourceUrl}): HTTP ${res.status}`,
    );
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function loadImages(productOldIdToNewId: Map<number, number>): Promise<void> {
  const rows = await query<AssetImageRow>(
    `SELECT v.product_id    AS product_id,
            a.alt           AS alt,
            a.position      AS position,
            b.key           AS blob_key,
            b.filename      AS filename,
            b.content_type  AS content_type
       FROM spree_assets a
       JOIN spree_variants v
         ON v.id = a.viewable_id
       JOIN active_storage_attachments att
         ON att.record_type = 'Spree::Asset'
        AND att.record_id   = a.id
        AND att.name        = 'attachment'
       JOIN active_storage_blobs b
         ON b.id = att.blob_id
      WHERE a.viewable_type = 'Spree::Variant'
      ORDER BY v.product_id, a.position NULLS LAST, a.id`,
  );

  // Group by new product id, preserving source order for position assignment.
  const byProduct = new Map<number, AssetImageRow[]>();
  for (const r of rows) {
    const productId = productOldIdToNewId.get(Number(r.product_id));
    if (productId === undefined) continue; // deleted product
    const list = byProduct.get(productId) ?? [];
    list.push(r);
    byProduct.set(productId, list);
  }

  let created = 0;
  let kept = 0;
  let removed = 0;

  for (const [productId, assetRows] of byProduct) {
    const desired: { url: string; alt: string | null; position: number }[] = [];
    for (let i = 0; i < assetRows.length; i += 1) {
      const r = assetRows[i];
      if (!r) continue;
      const url = await resolveUrl(r);
      desired.push({
        url,
        alt: r.alt,
        // Fall back to source order when position is null/duplicated.
        position: r.position ?? i,
      });
    }

    const desiredUrls = new Set(desired.map((d) => d.url));
    const existing = await db.productImage.findMany({
      where: { productId },
      select: { id: true, url: true },
    });
    const existingByUrl = new Map(existing.map((e) => [e.url, e.id]));

    // Remove images no longer present in source.
    const stale = existing.filter((e) => !desiredUrls.has(e.url));
    if (stale.length > 0) {
      await db.productImage.deleteMany({
        where: { id: { in: stale.map((s) => s.id) } },
      });
      removed += stale.length;
    }

    // Upsert each desired image by (productId, url).
    for (const d of desired) {
      const existingId = existingByUrl.get(d.url);
      if (existingId !== undefined) {
        await db.productImage.update({
          where: { id: existingId },
          data: { alt: d.alt, position: d.position },
        });
        kept += 1;
      } else {
        await db.productImage.create({
          data: { productId, url: d.url, alt: d.alt, position: d.position },
        });
        created += 1;
      }
    }
  }

  console.log(
    `[images] created ${created}, updated ${kept}, removed ${removed} ` +
      `(MIGRATE_BLOBS=${MIGRATE_BLOBS})`,
  );
}
