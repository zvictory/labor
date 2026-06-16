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

Delivered so far: **P0** (scaffold + schema + ETL), an early slice of **P1** (storefront), **P2** (cart + checkout + orders), **P3** (payment order-mutation), **P5** (auth/sessions + Telegram bot + notifications), and a first slice of **P4** (live delivery quotes, display-only). Not built yet: charged dynamic delivery fee + shipment creation (rest of P4), admin (P6), cutover (P7).

### P5 — auth, accounts, Telegram bot (added)
- **Auth.js (next-auth v5, JWT):** `lib/auth/*` with three credential providers — Telegram Login Widget (find-or-create User by `telegramId`, source of truth), staff email/password (bcrypt vs `passwordHash`, role-gated), and phone OTP. `getCurrentUser()` server helper. New `OtpCode` model (bcrypt-hashed codes, 5-min expiry, rate-limited, attempt ceiling) + `app/api/auth/*`. Account pages: login, overview, my-orders.
- **Cart/order association:** guest cart merges into the user cart on sign-in (`mergeGuestCartIntoUser`); `createOrderFromCart` attaches `userId` from session. Guests still allowed (phone identity). Cart↔session cycle broken with a lazy import.
- **Telegram bot (grammy, webhook mode):** `lib/telegram/*` — `/start`, `/help`, `/lang` (updates `preferredLocale`); the webhook route validates the secret-token header. `lib/telegram/webapp-auth.ts` provides the HMAC verifiers consumed by the auth provider. `notifyOrderPaid`/`notifyOrderStatus` send localized order updates to the customer + an optional admin chat — fired from `markOrderPaid` **only on the real paid transition** (idempotent, best-effort, lazy import).

### P4 (partial) — live delivery quotes (added)
- `lib/delivery/quote.ts` + `app/api/delivery/quote/route.ts` + a `delivery-quote` checkout island: for the in-Tashkent courier option it fetches a live Yandex estimate (region-center-coarse geocode, `TODO` per-address); any failure silently falls back to the method `baseFee`. **Display-only** — the charged fee and order totals remain the method `baseFee`; dynamic charging + shipment creation come later.

### P4/P5 follow-ups (non-blocking)
- Dependencies `next-auth@5-beta`, `bcryptjs`, `grammy` added to `package.json` (install on the dev machine).
- New env: `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`, `TELEGRAM_ADMIN_CHAT_ID`, `TELEGRAM_BOT_USERNAME`, `YANDEX_MARKUP_TYPE/VALUE` (added to `.env.example`).
- Delivery quote geocoding is city-center-coarse; make it the charged fee + create a Yandex shipment on paid in a later step.
- Set the Telegram webhook on deploy (`setWebhook` with the secret token); the bot runs in webhook mode (no separate polling process yet).

### P2 — cart + checkout (added)
- **Cart:** server-backed via Prisma + an httpOnly guest-cookie token (`labor_cart`). `lib/cart/{cart,actions}.ts`, `app/api/cart/route.ts`, client islands (`add-to-cart`, `cart-count-badge`, `mini-cart`, line controls), `(store)/cart/page.tsx`. Add-to-cart wired into the PDP and product cards; header shows a live count. Sample/decant line = ~8% of price. Subtotal only (delivery added at checkout). No inventory model → no stock checks.
- **Checkout/orders:** `(store)/checkout` (uz-regions address, delivery method, summary, payment choice) → `lib/orders/create.createOrderFromCart` (transactional, `LB-YYYYMMDD-XXXXXX` number, snapshots line prices, clears cart) → `lib/payments/initiate.startPayment` builds the Payme/Click redirect. Cash-on-delivery lands on the confirmation page. `(store)/orders/[number]` shows status. Guest checkout (name+phone); `userId` left as a `TODO(auth)`.

### P3 — payment order-mutation (added)
- `lib/orders/payment-state.ts` — idempotent transitions (`markPaymentAuthorized`, `markOrderPaid`, `markPaymentCanceled`) wrapped in transactions, guarding against double-apply and never rewinding shipped/delivered orders.
- Filled the `TODO(P3)` blocks in the Payme route (CreateTransaction→authorized, PerformTransaction→paid, CancelTransaction→canceled) and the Click webhook (PREPARE→authorized, COMPLETE→paid/canceled). Verification + idempotent event recording untouched.
- Provider success-redirect URLs corrected to the real confirmation route `/${locale}/orders/{number}`.

### P2/P3 follow-ups (non-blocking)
- Auth/session not wired yet → orders are guest (phone identity); add user association + guest-cart merge in P5.
- Checkout copy is inline tri-lingual with a `TODO(i18n)` to move into a next-intl `checkout` namespace.
- No `(orders, provider)` DB unique → payment-state uses find-or-create (`findFirst`); fine for one in-flight payment per order.

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
