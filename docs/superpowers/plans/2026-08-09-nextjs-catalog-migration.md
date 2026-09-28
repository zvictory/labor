# Next.js Catalog Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Labor’s catalog-facing experience from Rails/Spree-backed `apps/web` to the Rails-free `apps/store`, preserving products, product details, images, notes, accords, brands, perfumers, translations, and existing catalog page content.

**Architecture:** `apps/store` is the only runtime storefront and reads the Prisma catalog database. The existing Spree database remains read-only during migration and is used only by the idempotent ETL; `apps/backend` and `apps/web` are retained as rollback/archive sources until parity and visual checks pass. No orders, users, carts, payments, or historical data are migrated in this scope.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Prisma 5, PostgreSQL, next-intl, Tailwind, Vitest, Playwright.

## Global Constraints

- Preserve catalog source data from Spree/Mobility and use `ru` as the fallback locale.
- Preserve `ru`, `en`, `uz`, and `uzc` storefront locale behavior; do not silently drop Uzbek Cyrillic content.
- Store prices as integer UZS values; do not introduce multi-currency behavior.
- Keep image migration re-runnable and never delete legacy source data.
- Use npm scripts and strict TypeScript; no `any` types.
- Keep unrelated checkout, payment, Telegram, and admin work out of this catalog migration.

### Task 1: Harden catalog ETL and verification

**Files:**
- Modify: `apps/store/scripts/etl/index.ts`, `apps/store/scripts/etl/report.ts`, and affected catalog loaders
- Modify: `apps/store/scripts/etl/README.md`
- Test: `apps/store/scripts/etl/*.test.ts` or the project’s existing ETL test location

**Interfaces:**
- Consumes: `SPREE_DATABASE_URL`, `DATABASE_URL`, `PUBLIC_HOST`, and the existing source-to-target Prisma schema.
- Produces: idempotent catalog rows and a verification report covering products, product images, notes, accords, brands, perfumers, and all product join tables.

- [ ] Verify source-to-target counts for every catalog entity and ensure report mismatches distinguish deleted-product filtering from unexpected loss.
- [ ] Ensure locale collapse preserves `ru`, `uz`, `en`, and `uzc` when present, with a deterministic `ru` fallback.
- [ ] Ensure image loader preserves source ordering, alt text, stable keys, and a usable URL for every migrated image.
- [ ] Remove users, wishlist, and other out-of-scope ETL work from the catalog cutover path, or explicitly gate it behind a separate flag without changing catalog behavior.
- [ ] Add deterministic tests for locale fallback, price conversion, image URL construction, and re-run/upsert behavior.

### Task 2: Complete catalog data access contracts

**Files:**
- Modify: `apps/store/lib/catalog/products.ts`, `brands.ts`, `notes.ts`, `perfumers.ts`
- Modify: `apps/store/lib/catalog/types.ts` and locale helpers as required
- Test: `apps/store/lib/catalog/*.test.ts`

**Interfaces:**
- Consumes: Prisma catalog models and locale JSON fields.
- Produces: typed list/detail DTOs for products, brands, notes, accords, and perfumers, including related product cards and image URLs.

- [ ] Add brand, note, and perfumer product-list queries using the same active-product and locale rules as catalog filtering.
- [ ] Make all translated display values resolve through one shared locale fallback helper.
- [ ] Keep product detail projections complete for gallery images, description, gender, concentration, accords, scent pyramid, perfumers, brand, and similar products.
- [ ] Add tests for missing translations, missing images, inactive products, and empty related collections.

### Task 3: Port catalog pages into `apps/store`

**Files:**
- Create/modify: `apps/store/app/[locale]/(store)/brands/page.tsx`
- Create/modify: `apps/store/app/[locale]/(store)/brands/[slug]/page.tsx`
- Create/modify: `apps/store/app/[locale]/(store)/notes/page.tsx`
- Create/modify: `apps/store/app/[locale]/(store)/notes/[slug]/page.tsx`
- Create/modify: `apps/store/app/[locale]/(store)/perfumers/page.tsx`
- Create/modify: `apps/store/app/[locale]/(store)/perfumers/[slug]/page.tsx`
- Modify: existing home, catalog, and product routes only where links or metadata require it

**Interfaces:**
- Consumes: typed catalog queries from Task 2 and existing store UI primitives.
- Produces: locale-prefixed server-rendered catalog pages with working links between product, brand, note, and perfumer views.

- [ ] Port the content and route behavior from the corresponding `apps/web` pages without retaining Rails API calls.
- [ ] Add `generateStaticParams`/metadata only where the data source is safe and bounded; otherwise use dynamic server rendering with not-found handling.
- [ ] Ensure every page handles empty results and missing slugs with the project’s existing not-found conventions.
- [ ] Add visible links from product details to brand, note, and perfumer pages and back to filtered catalog results.

### Task 4: Migrate and verify catalog assets

**Files:**
- Modify: `apps/store/scripts/etl/loaders/images.ts`, storage helpers, and `next.config.mjs`
- Modify: `apps/store/public` catalog assets/manifests where existing local note, brand, or perfumer art is reused
- Test: Playwright catalog smoke coverage

**Interfaces:**
- Consumes: ActiveStorage source attachments and existing local design assets.
- Produces: stable image URLs accepted by Next Image and rendered in product, note, brand, and perfumer pages.

- [ ] Run the ETL against a read-only Spree snapshot with blob references first; upload bytes to object storage only after URL parity is confirmed.
- [ ] Validate representative product galleries and every taxonomy page’s images at runtime.
- [ ] Record missing/unreachable assets in the ETL report instead of silently rendering broken images.

### Task 5: Cutover and archive

**Files:**
- Modify: `infra/docker-compose.yml`, deployment/nginx configuration, and `apps/store` runtime configuration only after QA
- Create: migration/cutover runbook under `docs/`

**Interfaces:**
- Consumes: parity report, visual smoke tests, and confirmed production environment variables.
- Produces: `apps/store` as the catalog storefront; Rails and `apps/web` retained as versioned rollback archives.

- [ ] Run typecheck, lint, unit tests, build, and catalog Playwright smoke tests.
- [ ] Compare source and target counts and manually spot-check at least 20 products across brands, notes, perfumers, translations, and image galleries.
- [ ] Switch the catalog hostname/route to `apps/store` only after all acceptance checks pass.
- [ ] Tag/archive Rails and old web sources; do not delete them until the agreed rollback retention period expires.

## Acceptance Criteria

- Every active source product is reachable by slug in `apps/store` with correct localized name, description, price, images, brand, perfumers, accords, and notes.
- Brand, note, and perfumer list/detail pages work for all migrated records and link to filtered catalog results.
- ETL can be run twice without duplicate catalog rows or image records.
- No catalog page makes a runtime request to the Rails/Spree API.
- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass in `apps/store`.

## Assumptions

- `apps/store` remains the canonical app and its Prisma schema remains the target schema.
- Existing checkout/payment/admin code is left in place but is not part of catalog acceptance.
- Source catalog data is available through a read-only PostgreSQL connection and source images are reachable during migration.
