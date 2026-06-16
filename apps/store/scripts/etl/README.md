# Catalog ETL — Spree → Prisma

One-time (re-runnable) migration of the Labor Parfum catalog from the **old Spree
Postgres DB** into the **new Prisma/Postgres DB**. Reads the legacy DB read-only;
writes the target via Prisma (`@/lib/db`).

## What it migrates

`brands → notes → accords → perfumers → products (+ price) → fragranceDetails →
productNotes / productAccords / productPerfumers / productSimilars → images →
users → votes / wishlist → campaigns`, then writes a verification report.

**Not migrated:** orders, line items, payments, carts — orders start fresh in the
new app (per the migration plan). Spree/Devise auth columns are dropped; staff
accounts are re-provisioned.

## Required env

| Var | Required | Purpose |
|---|---|---|
| `SPREE_DATABASE_URL` | yes | Read-only connection string to the **legacy Spree** Postgres DB (the source). |
| `DATABASE_URL` | yes | Target Postgres for Prisma (`@/lib/db`). |
| `MIGRATE_BLOBS` | no (default `false`) | `true` → download each ActiveStorage blob from `PUBLIC_HOST` and re-upload to object storage via `@/lib/storage.putObject`, storing the new URL. `false` → store a reference URL on the existing Spree blob host (copy bytes later). |
| `PUBLIC_HOST` | yes when handling images | Host that already serves the legacy Spree ActiveStorage blobs. Used to build reference URLs and, when `MIGRATE_BLOBS=true`, to fetch the bytes. |

The target Prisma schema must already be migrated (`prisma migrate deploy`) before
running this.

## How to run

```bash
# from apps/store/
SPREE_DATABASE_URL="postgres://readonly@old-host:5432/spree" \
DATABASE_URL="postgres://app@new-host:5432/labor" \
MIGRATE_BLOBS=false \
PUBLIC_HOST="https://old.labor.local" \
  npx tsx scripts/etl/index.ts
```

The script is **idempotent**: every loader upserts by a natural key
(`slug`, `telegramId`/`email`, or a composite join key such as
`(productId, noteId, pyramidLayer)` / `(productId, accordId)` /
`(userId, productId)`). Re-running converges — safe to run repeatedly, e.g. a
final re-sync at cutover.

Images are re-runnable too: the destination object key is the ActiveStorage blob
`key` (stable), and per product the loader removes images no longer in source and
creates only missing ones.

## Verification (from the migration plan §5)

1. **Row-count parity.** After a run, inspect `scripts/etl/etl-report.json`
   (also printed to stdout). It lists source vs target counts per entity and a
   `mismatches` array.
   - `products` source counts **exclude `deleted_at`** rows (matching the loader).
   - Join/engagement/image tables may be **legitimately lower** on the target when
     a source row references a deleted product or an unkeyed user — each such row
     carries a `note`. Investigate only unexpected deltas.
2. **Spot-check 10–20 products end-to-end.** For a sample of slugs, confirm in the
   new DB:
   - `name` / `description` present in all three locales (`ru` required, `uz`/`en`
     where the source had them; `ru` fallback otherwise);
   - notes grouped by `pyramidLayer` (top/middle/base) with `position`;
   - accords with `weight` and `colorHex`;
   - `price` (integer UZS minor units) matches the Spree default UZS price;
   - images resolve (URL reachable);
   - linked `brand` and `perfumer(s)` correct;
   - `FragranceDetail` (gender, concentration, avg_*, breakdown JSON) present.
3. Keep the Spree DB **read-only** until the new app passes QA, enabling rollback.

## Source → target mapping (summary)

| Target (Prisma) | Source | Key collapse / transform |
|---|---|---|
| `Brand` | `labor_brands` + `labor_brand_translations` | `name` from base; `description`/`story` → `{ru,uz,en}` |
| `Note` | `labor_notes` + `labor_note_translations` | `name` base+trans → required JSON; `description` → JSON |
| `Accord` | `labor_accords` + translations | `name` → required JSON; `colorHex` |
| `Perfumer` | `labor_perfumers` + translations | `name` from base; `bio` → JSON |
| `Product` (+`price`) | `spree_products` + `spree_product_translations`; `spree_prices` via `spree_variants` | name/description → JSON; UZS default price `Math.round(Number(amount))`; skip `deleted_at` |
| `FragranceDetail` | `labor_product_fragrance_details` | brand via old-id map; `*_breakdown` jsonb passthrough |
| `ProductNote` | `labor_product_notes` | `pyramidLayer`, `position`; note via slug |
| `ProductAccord` | `labor_product_accords` | `weight`; accord via slug |
| `ProductPerfumer` | `labor_product_perfumers` | perfumer via slug |
| `ProductSimilar` | `labor_product_similars` | both sides via product old-id map |
| `ProductImage` | `spree_assets` → `active_storage_attachments`/`blobs` | URL via storage or reference host; `alt`, `position` |
| `User` | `spree_users` | `telegramId` (BigInt, source of truth), `email`, `preferredLocale` |
| `Vote` | `labor_votes` | rating/longevity/sillage/loveLevel + seasons/timeOfDay JSON |
| `WishlistItem` | `labor_wishlist_items` | user↔product |
| `Campaign`/`Slide`/`Product` | `labor_campaigns`/`_slides`/`_products` (+translations) | `status` → `active`; slides rebuilt; products via product old-id map |
```
