// ETL verification report: compares source (Spree) vs target (Prisma) row counts
// per entity and writes scripts/etl/etl-report.json.
//
// Parity rules:
//   - Most entities should match 1:1.
//   - products: source counts ONLY non-deleted rows (deleted_at IS NULL), matching
//     what the loader migrates.
//   - join/engagement tables may legitimately be LOWER on the target when their
//     source rows reference a deleted product or an unkeyed user — those are
//     reported as a delta, not necessarily an error.
//
// The report flags `match: false` where counts differ so a human can eyeball the
// 10-20 product spot-check described in the README.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '@/lib/db';
import { count } from './source';
import { validatePublicUrlPrefix } from './media';

interface EntityCount {
  entity: string;
  source: number;
  target: number;
  delta: number;
  match: boolean;
  note?: string;
}

interface MediaReport {
  brandLogos: { sourceNonEmpty: number; targetNonEmpty: number; match: boolean };
  noteIcons: { sourceNonEmpty: number; targetNonEmpty: number; match: boolean };
  publicPrefix: {
    configured: string | null;
    checked: boolean;
    targetNonEmpty: number;
    targetWithPrefix: number;
    match: boolean;
  };
}

function countNonEmpty(values: ReadonlyArray<string | null>): number {
  return values.filter((value) => value?.trim()).length;
}

export async function runReport(): Promise<EntityCount[]> {
  const rows: EntityCount[] = [];

  const add = (entity: string, source: number, target: number, note?: string): void => {
    rows.push({
      entity,
      source,
      target,
      delta: target - source,
      match: source === target,
      note,
    });
  };

  // Catalog
  add('brands', await count('labor_brands'), await db.brand.count());
  add('notes', await count('labor_notes'), await db.note.count());
  const sourceBrandLogoCount = await count(
    'labor_brands',
    "logo_url IS NOT NULL AND BTRIM(logo_url) <> ''",
  );
  const sourceNoteIconCount = await count(
    'labor_notes',
    "icon_url IS NOT NULL AND BTRIM(icon_url) <> ''",
  );
  const targetBrandLogos = (await db.brand.findMany({ select: { logoUrl: true } })).map(
    ({ logoUrl }) => logoUrl,
  );
  const targetNoteIcons = (await db.note.findMany({ select: { iconUrl: true } })).map(
    ({ iconUrl }) => iconUrl,
  );
  const targetBrandLogoCount = countNonEmpty(targetBrandLogos);
  const targetNoteIconCount = countNonEmpty(targetNoteIcons);
  add(
    'brandLogos',
    sourceBrandLogoCount,
    targetBrandLogoCount,
    'non-empty source and target logo URLs',
  );
  add(
    'noteIcons',
    sourceNoteIconCount,
    targetNoteIconCount,
    'non-empty source and target icon URLs',
  );
  add('accords', await count('labor_accords'), await db.accord.count());
  add('perfumers', await count('labor_perfumers'), await db.perfumer.count());
  add(
    'products',
    await count('spree_products', 'deleted_at IS NULL'),
    await db.product.count(),
    'source excludes deleted_at',
  );
  add(
    'fragranceDetails',
    await count('labor_product_fragrance_details'),
    await db.fragranceDetail.count(),
    'target may be lower: rows for deleted products are skipped',
  );
  add(
    'productNotes',
    await count('labor_product_notes'),
    await db.productNote.count(),
    'target may be lower: rows for deleted products are skipped',
  );
  add(
    'productAccords',
    await count('labor_product_accords'),
    await db.productAccord.count(),
    'target may be lower: rows for deleted products are skipped',
  );
  add(
    'productPerfumers',
    await count('labor_product_perfumers'),
    await db.productPerfumer.count(),
    'target may be lower: rows for deleted products are skipped',
  );
  add(
    'productSimilars',
    await count('labor_product_similars'),
    await db.productSimilar.count(),
    'target may be lower: rows referencing deleted products are skipped',
  );
  add(
    'productImages',
    await count(
      "spree_assets a JOIN spree_variants v ON v.id = a.viewable_id JOIN active_storage_attachments att ON att.record_type = 'Spree::Asset' AND att.record_id = a.id AND att.name = 'attachment'",
      "a.viewable_type = 'Spree::Variant'",
    ),
    await db.productImage.count(),
    'target may be lower: images for deleted products are skipped',
  );

  // Users & engagement
  add(
    'users',
    await count('spree_users'),
    await db.user.count(),
    'target may be lower: users with neither telegram_id nor email are skipped',
  );
  add(
    'votes',
    await count('labor_votes'),
    await db.vote.count(),
    'target may be lower: votes for unmigrated user/product are skipped',
  );
  add(
    'wishlist',
    await count('labor_wishlist_items'),
    await db.wishlistItem.count(),
    'target may be lower: items for unmigrated user/product are skipped',
  );

  // Marketing
  add('campaigns', await count('labor_campaigns'), await db.campaign.count());
  add(
    'campaignProducts',
    await count('labor_campaign_products'),
    await db.campaignProduct.count(),
    'target may be lower: products that were deleted are skipped',
  );

  const migrateBlobs = process.env.MIGRATE_BLOBS === 'true';
  const configuredPublicPrefix = (process.env.S3_PUBLIC_URL ?? '').replace(/\/+$/, '');
  const targetMediaUrls = [...targetBrandLogos, ...targetNoteIcons];
  const prefixValidation = validatePublicUrlPrefix(targetMediaUrls, configuredPublicPrefix);
  const targetMediaWithPrefix = migrateBlobs ? prefixValidation.targetWithPrefix : 0;
  const targetMediaCount = prefixValidation.targetNonEmpty;
  const media: MediaReport = {
    brandLogos: {
      sourceNonEmpty: sourceBrandLogoCount,
      targetNonEmpty: targetBrandLogoCount,
      match: sourceBrandLogoCount === targetBrandLogoCount,
    },
    noteIcons: {
      sourceNonEmpty: sourceNoteIconCount,
      targetNonEmpty: targetNoteIconCount,
      match: sourceNoteIconCount === targetNoteIconCount,
    },
    publicPrefix: {
      configured: configuredPublicPrefix || null,
      checked: migrateBlobs,
      targetNonEmpty: targetMediaCount,
      targetWithPrefix: targetMediaWithPrefix,
      match: !migrateBlobs || Boolean(configuredPublicPrefix && prefixValidation.match),
    },
  };
  if (migrateBlobs) {
    add(
      'taxonomyMediaPublicUrls',
      targetMediaCount,
      targetMediaWithPrefix,
      `target URLs must use ${configuredPublicPrefix || '<missing S3_PUBLIC_URL>'}`,
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    migrateBlobs,
    media,
    entities: rows,
    mismatches: rows.filter((r) => !r.match).map((r) => r.entity),
  };

  const outPath = join(__dirname, 'etl-report.json');
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('\n[report] entity counts (source -> target):');
  for (const r of rows) {
    const flag = r.match ? 'ok ' : 'DIFF';
    console.log(
      `  [${flag}] ${r.entity.padEnd(18)} ${String(r.source).padStart(7)} -> ${String(
        r.target,
      ).padStart(7)}  (${r.delta >= 0 ? '+' : ''}${r.delta})`,
    );
  }
  console.log(`[report] written to ${outPath}`);

  return rows;
}
