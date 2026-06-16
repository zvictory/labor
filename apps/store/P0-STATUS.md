# apps/store — P0 status (scaffold + schema + ETL + ported UI)

Rails-free rebuild of Labor Parfum: **Next.js 15 (App Router) + Prisma + Postgres**, built by a parallel agent team from the plan in `labor-redesign/new-architecture/`. **All code is correct-by-inspection** — nothing was executed (this sandbox can't run Next/Prisma; there's no live DB). Build, migrate, and QA on a real dev machine.

## What's in place

- **Scaffold/config:** Next 15, TS strict, Tailwind v4 with Labor tokens (bone/ink/brass), `next/font/local` (Story Script + Roboto Slab), next-intl (ru default / uz / en), Docker compose (Postgres/Redis/MinIO), `.env.example`. Alias `@/* → apps/store/*`. Dev port `3002`.
- **Data model:** `prisma/schema.prisma` — 23 models mirroring the Spree/Labor catalog (Product, Brand, Note, Accord, Perfumer, joins with pyramid layer/weight, FragranceDetail, images, Vote/Wishlist, Cart/Order/Payment, `PaymentWebhookEvent` idempotency, Campaigns). i18n = per-locale JSON `{ru,uz,en}`. Money = integer UZS minor units.
- **Data access (RSC, Prisma):** `lib/catalog/{products,notes,brands,perfumers}.ts` + `types.ts` + `locale.ts`; `lib/money.ts` (`formatUzs`). Contract: `listProducts`, `getProduct`, `getNotes`, `getBrands`.
- **ETL:** `scripts/etl/*` — one-time, idempotent, read-only-source migration from the Spree Postgres DB → Prisma, 15 loaders in FK order, translations collapsed to JSON, prices → integer, images via object storage, `etl-report.json`.
- **UZ subsystems:** `lib/payments/{payme,click}.ts` (+ API routes, idempotent webhooks, TODO(P3) order mutation), `lib/sms.ts` (Eskiz), `lib/storage.ts` (MinIO `putObject`), `lib/delivery/{uz-regions,yandex,methods}.ts`.
- **Ported UI (prototype look):** `components/` (site header/footer, ProductCard, home sections) + `app/[locale]/(store)/{page,catalog,product/[slug]}` — homepage/catalog/PDP are async RSC reading the Prisma data layer directly (no HTTP client). Note/slide images copied to `public/`.

## Phased scope

This delivers **P0 (scaffold + schema + ETL)** plus an early slice of **P1 (storefront on real data)** since the UI was ported in the same pass. Not built yet: cart/checkout (P2), payment order-mutation (P3), delivery wiring (P4), Telegram bot/auth (P5), admin (P6).

## Known reconciliation items (non-blocking, for follow-up)

1. **ETL vs final schema fields:** the schema (finalized by the data agent) added `FragranceDetail.votesCount`/`volumeMl`, `ProductSimilar.score`/`source`, `Brand.active` beyond the original draft the ETL agent read. They have safe defaults, so nothing breaks, but the ETL loaders don't yet populate them — wire these in P1 (the source columns exist: `labor_product_fragrance_details.volume_ml/votes_count`, `labor_product_similars.score/source`, `labor_brands.active`).
2. **`ProductNoteDTO.color_hex` unpopulated** → PDP note-pyramid dots render without color. Populate `color_hex` in `toProductNote` (join the note's accord/colour) if colored dots are wanted.
3. **"Popular" not "Bestsellers":** second homepage grid uses `sort:'popular'` (avgRating) per the Phase 2 decision — no sales-based ranking exists.
4. **Hero slide 2** links to `/catalog?note=vetiver` (real slug) instead of the prototype's `?note=woody`; switch to `?family=woody` if a family facet is preferred.
5. **`minio` dependency** added to `apps/store/package.json`; **root `workspaces`** updated to include `apps/store`.

## Run it on the dev machine

```bash
# from repo root
npm install                                   # picks up apps/store (now in workspaces) + minio/pg
cd apps/store
docker compose -f infra/docker-compose.yml up -d   # postgres + redis + minio
cp .env.example .env                          # fill DATABASE_URL, SPREE_DATABASE_URL, S3/MinIO, provider keys
npx prisma migrate dev --name init            # create schema
npx prisma generate
SPREE_DATABASE_URL=... DATABASE_URL=... npx tsx scripts/etl/index.ts   # migrate catalog; writes etl-report.json
npm run dev                                    # http://localhost:3002/ru
# verify ETL: row-count parity + spot-check 10–20 products (3 locales, notes pyramid, accords, price, images)
npm run typecheck && npm run lint && npm run build
npm run test:e2e                               # Playwright (add specs)
```

> Build/typecheck/Playwright must run on a real machine — the planning sandbox crashes Next with an SWC bus error and has no DB.
