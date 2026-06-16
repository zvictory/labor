# Labor Parfum — New Architecture & Migration Plan

Replacing the Spree/Rails backend with a fresh, single-stack **Next.js + Prisma + Postgres** application, built around the existing Labor prototype design, with the real catalog migrated by ETL. This is a **plan, not code.**

### Decisions locked (from product owner)
1. **Fresh build, bebio as reference** — a clean new app shaped by the Labor prototype; copy only specific, proven pieces from `bebio_store` (Payme/Click protocol, Uzbek regions, Eskiz SMS, Yandex delivery, Playwright). Do **not** fork bebio wholesale, and do **not** keep Rails/Spree.
2. **Migrate the existing catalog by ETL** — one-time export from the current Spree Postgres DB → import into the new Prisma/Postgres schema, preserving products, fragrance notes/accords/perfumers/brands, translations (ru/uz/en), votes, wishlists, and image references.
3. **Plan first** — this document + a draft Prisma schema (`schema.prisma`) + a Claude Code execution prompt. No application code yet.

---

## 1. Goal & principles

Ship the same premium fragrance storefront Labor already designed, on an architecture the team can own end-to-end without Rails/Spree, while **keeping all real catalog data and imagery**.

Principles:
- **One stack.** A single Next.js 15 App Router app owns UI, server data access (Prisma), API route handlers (payments/delivery/bot webhooks), and i18n. No second backend service except the Telegram bot process.
- **Reuse the UI we already built.** The current `apps/web` frontend already implements the prototype (Phase 1 homepage, `ProductCard`, finder, fonts, next-intl ru/uz/en, `formatUzs`). Carry these components over; only the **data layer** changes — from "HTTP fetch to Rails" to "Prisma on the server."
- **No fabricated data.** Catalog fields come from the migrated DB. UZS stays integer minor units. Ratings/votes are real.
- **bebio is a reference, not a dependency.** Reimplement its Uzbek-specific logic in our codebase/style; don't import its UI or Prisma schema verbatim.
- **Idempotent, auditable payments** — preserve the `payment_webhook_events` idempotency pattern.

---

## 2. Target architecture

```
labor (new monorepo or single app)
├─ app/                         Next.js 15 App Router (RSC-first)
│  ├─ [locale]/(store)/...      storefront (prototype design): home, catalog, product, cart,
│  │                            checkout, finder, brands, notes, perfumers, account, delivery
│  ├─ [locale]/admin/...        internal admin (catalog, orders, campaigns) — phase later
│  └─ api/                      Route Handlers: payments/{payme,click,uzum}, delivery/*,
│                               telegram/webhook, auth/*, cart, checkout, search
├─ lib/
│  ├─ db.ts                     Prisma client singleton
│  ├─ catalog/                  server data access (products, notes, accords, brands, perfumers)
│  ├─ money.ts                  formatUzs (UZS integer minor units) — ported from apps/web
│  ├─ payments/{payme,click,uzum}.ts   protocol + verify (reference bebio)
│  ├─ delivery/{yandex,bts,express24}.ts + uz-regions.ts
│  ├─ sms.ts                    Eskiz (reference bebio)
│  ├─ telegram/                 grammy bot + webapp auth + order notifications
│  └─ storage.ts                object storage (S3/MinIO) for product images
├─ prisma/
│  ├─ schema.prisma             (draft provided alongside this doc)
│  └─ migrations/
├─ scripts/
│  └─ etl/                      one-time Spree→Prisma migration (see §7)
├─ messages/{ru,uz,en}.json     next-intl UI strings (carry over from apps/web)
├─ components/                  prototype-derived UI (carry over + extend)
├─ e2e/                         Playwright (mobile-first, reference bebio)
└─ workers/                     background jobs (rating recompute, notifications) — optional
```

Runtime choices (recommended, all changeable in §"open questions"):
- **DB:** PostgreSQL 15 + **Prisma** ORM.
- **Auth:** Auth.js (NextAuth) with a **Telegram** provider as the source of truth (preserve `telegram_id` semantics), optional **Eskiz SMS OTP** for phone login (bebio reference). Staff use email/password.
- **Images/object storage:** S3-compatible (MinIO in dev, per bebio) — migrate ActiveStorage blobs here, store URLs on `ProductImage`.
- **Telegram:** **grammy** bot as a small separate Node process (long-poll/webhook) + a Next route handler for inbound webhooks and order notifications. Same lib Labor already uses.
- **Background work:** start with inline/route-handler logic; add a queue (BullMQ/Redis) only when needed (rating rollups, retries).
- **i18n:** next-intl, locales **ru (default), uz, en** — unchanged from today.
- **Hosting:** Node server (not edge) so Prisma + grammy run; Postgres + Redis + MinIO via Docker compose, mirroring the current dev ergonomics.

---

## 3. What we keep, drop, and reference

**Keep / carry over from current `apps/web` (it already encodes the prototype):**
- All prototype-derived UI: Phase 1 homepage + sections, `ProductCard`, the real scent finder, fonts (Roboto Slab + Story Script via `next/font/local`), Tailwind tokens (`bone/ink/brass`), `formatUzs`, next-intl setup and `messages/*.json`.
- The catalog query *shape* and Zod contracts (`@labor/api-client/catalog`) — reuse as the typed boundary between Prisma and the UI.

**Drop:**
- `apps/backend` (Spree/Rails) entirely — replaced by Prisma + route handlers.
- The HTTP API client to Rails (`src/lib/api/*` `apiFetch` to `/api/v2/storefront`) — replaced by **server-side Prisma data access** in RSC, with thin route handlers only where a client needs JSON (cart, search, payments, webhooks).
- Mobility/ActiveStorage/Spree STI payment records — replaced by Prisma translation columns and object storage.

**Reference from bebio (reimplement, don't import):**

| Need | bebio reference | Labor target |
|---|---|---|
| Payme webhook (JSON-RPC) | `lib/payme.ts`, `app/api/payment/payme/route.ts` | `app/api/payments/payme/route.ts` + `lib/payments/payme.ts` (methods, error codes, tiyin check, auth) |
| Click pay + webhook | `lib/click.ts`, `app/api/payment/click/*` | `app/api/payments/click/*` + `lib/payments/click.ts` (HMAC verify, pay URL) |
| Uzbek regions/districts | `lib/uz-regions.ts` (283 lines, uz/ru + coords) | `lib/delivery/uz-regions.ts` — near-verbatim data reuse |
| SMS OTP | `lib/sms.ts` (Eskiz) | `lib/sms.ts` |
| Yandex delivery quote/shipment | `lib/yandex-delivery-client.ts`, admin routes | `lib/delivery/yandex.ts` |
| Telegram bot/notify/webapp | `lib/telegram*.ts`, `customer-bot-notify.ts` | `lib/telegram/*` (grammy) |
| Object storage | `lib/minio.ts` | `lib/storage.ts` |
| Mobile e2e | `e2e/`, Playwright projects | `e2e/` |

Licensing note: only reuse bebio code the team has rights to. The protocol knowledge (Payme/Click), the regions dataset, and Eskiz/grammy patterns are low-risk references; avoid copying substantial proprietary UI/business modules verbatim.

---

## 4. Data model (Prisma)

A concrete draft lives alongside this file: **`schema.prisma`**. Highlights and decisions:

- **Catalog:** `Product`, `Brand`, `Note`, `Accord`, `Perfumer`, join models `ProductNote` (with `pyramidLayer`, `position`), `ProductAccord` (with `weight`), `ProductPerfumer`, `ProductSimilar`, and `FragranceDetail` (gender, concentration, releaseYear, avgRating/longevity/sillage, reviewsCount, discontinued, and the `*_breakdown` JSON fields).
- **i18n strategy:** translatable text (`Product.name/description`, `Brand.description/story`, `Note.name/description`, `Accord.name`, `Perfumer.bio`, campaign text) stored as **per-locale JSON** (`{ ru, uz, en }`) on the row, with `ru` required. This replaces Mobility's side tables with one column and keeps RSC reads simple. (Alternative: dedicated `*Translation` tables — heavier; chosen JSON for ergonomics. Flagged in open questions.)
- **Money:** `Price` as **Int** (UZS minor units, integer so'm); no decimals, single currency UZS. Reuse `formatUzs`.
- **Images:** `ProductImage { url, alt, position }` pointing at object storage (migrated from ActiveStorage).
- **Commerce:** `User` (with `telegramId` unique = source of truth, synthesized email allowed), `Cart`/`CartItem`, `Order`/`OrderItem`, `Payment`, and **`PaymentWebhookEvent`** (unique on `provider + externalTxnId + eventType`) preserving idempotency.
- **Engagement:** `Vote` (rating/longevity/sillage/love + seasons/timeOfDay JSON) and `WishlistItem`, mirroring `labor_votes`/`labor_wishlist_items`.
- **Marketing:** `Campaign`, `CampaignSlide`, `CampaignProduct` (homepage hero/campaigns — currently static in the prototype; this lets them become admin-managed later).

---

## 5. Migration / ETL plan (Spree → Prisma)

A one-time, **idempotent, verifiable** script set in `scripts/etl/`, reading the **old Spree Postgres** (read-only) and writing the **new Prisma** DB. Run order respects FKs.

**Table mapping (verified against the live Spree `schema.rb`):**

| New (Prisma) | Source (Spree/Labor) | Notes |
|---|---|---|
| `Brand` (+ i18n JSON) | `labor_brands` + `labor_brand_translations` | `country, foundedYear, niche, website, slug`; collapse translations → `{ru,uz,en}`. No `logo_url` exists → leave logo null (curated SVG in UI). |
| `Note` (+ i18n) | `labor_notes` + `labor_note_translations` | `slug, family, iconUrl`; name/description per locale. |
| `Accord` (+ i18n) | `labor_accords` + translations | `slug, colorHex`; name per locale. |
| `Perfumer` (+ i18n) | `labor_perfumers` + translations | `slug, country`; bio per locale. |
| `Product` (+ i18n) | `spree_products` + `spree_product_translations` | `slug, status, availableOn`; name/description per locale; drop `deleted_at` rows. |
| `Price` | `spree_prices` (UZS, default) | `amount.to_i` → integer minor units. |
| `FragranceDetail` | `labor_product_fragrance_details` | gender, concentration, releaseYear, avg*, reviewsCount, discontinued, breakdown JSON; link `brandId`. |
| `ProductNote` | `labor_product_notes` | `pyramidLayer`, `position`. |
| `ProductAccord` | `labor_product_accords` | `weight`. |
| `ProductPerfumer` | `labor_product_perfumers` | join. |
| `ProductSimilar` | `labor_product_similars` | join. |
| `ProductImage` | `active_storage_attachments/blobs` on products | **copy blobs → object storage**, write resulting URLs + `alt`/`position`. |
| `User` | `spree_users` | `telegramId` (source of truth), email, preferredLocale; drop Spree-only auth columns. |
| `Vote` | `labor_votes` | rating/longevity/sillage/loveLevel + seasons/timeOfDay JSON. |
| `WishlistItem` | `labor_wishlist_items` | user↔product. |
| `Campaign/Slide/Product` | `labor_campaigns/_slides/_products` (+ translations) | optional; enables admin-managed hero later. |
| `Order/OrderItem` | `spree_orders/spree_line_items` | migrate only if order history must be preserved (decision in open questions). |
| `PaymentWebhookEvent` | `labor_payment_webhook_events` | preserve for audit continuity (optional). |

**ETL execution & safety:**
1. Snapshot the Spree DB; connect ETL **read-only** to it.
2. Run loaders in dependency order: brands → notes → accords → perfumers → products → prices → fragrance details → joins → images → users → votes/wishlist → campaigns.
3. **Images:** stream each ActiveStorage blob to object storage; record the new URL. Verify `next.config` `remotePatterns` allows the storage host. If keeping the existing Spree blob host short-term, point URLs there and migrate blobs later.
4. **Idempotency:** upsert by natural keys (`slug`, `telegramId`, `(productId,noteId,layer)`), so re-runs converge.
5. **Verify:** assert row-count parity per table; spot-check 10–20 products end-to-end (name in 3 locales, notes pyramid, accords+colors, price, images, brand, perfumer). Emit a `etl-report.json`.
6. Keep the Spree DB read-only until the new app passes QA, enabling rollback.

---

## 6. Subsystems

- **Payments (Payme, Click, Uzum):** route handlers under `app/api/payments/*`, each verifying provider auth/signature, doing the so'm↔tiyin amount check, and recording every event in `PaymentWebhookEvent` (unique `provider+externalTxnId+eventType`) before mutating order state. Reference bebio `lib/payme.ts` (JSON-RPC method set + error codes) and `lib/click.ts` (HMAC verify). Uzum: same pattern; confirm its spec.
- **Delivery (Yandex, BTS, Express24):** `lib/delivery/*` for quote/shipment/status; `uz-regions.ts` powers the checkout address selector.
- **Auth:** Auth.js; **Telegram is the source of truth** (`telegramId` unique, synthesized email `tg_{id}@labor.local` preserved for migrated users). Optional Eskiz SMS OTP for phone login. Staff: email/password with an admin role.
- **Telegram:** grammy bot process (start/help/lang, order status notifications) + a Next webhook route + mini-app webapp auth (HMAC of Telegram init data), mirroring today's flows.
- **Storage:** S3/MinIO; product images served via `next/image` with the storage host allow-listed.

---

## 7. Design system (from the prototype)

Carry the established Labor look: **Story Script** (display/wordmark) + **Roboto Slab** (body) via `next/font/local`; Tailwind tokens `bone/ink/brass`; the Phase 1 homepage sections, `ProductCard`, notes pyramid, finder, mood/notes browsing, trust/Telegram CTAs. Story Script is Latin-only → RU/UZ headings fall back to Georgia (already handled). No redesign in this migration — the architecture changes underneath an unchanged UI.

---

## 8. Testing & QA

- **Playwright** mobile-first e2e (reference bebio's `mobile-android`/`mobile-ios` projects + prod smoke tests) — this finally gives Labor the browser QA that the Spree sandbox couldn't run. Cover: home, catalog, PDP, finder, cart, checkout happy path, locale switch, payment redirect stubs.
- **Vitest** for `lib/` units (money, payment verifiers, ETL mappers, scoring).
- **Typecheck/lint/build** via the app's own scripts (run on the real dev machine — the planning sandbox cannot run Next due to an SWC bus error).

---

## 9. Phased roadmap

- **P0 — Scaffold + schema + ETL.** New Next.js app, Prisma schema, Docker (PG/Redis/MinIO), ETL script, verified data parity. Storefront not yet wired.
- **P1 — Read-only storefront on real data.** Home, catalog, PDP, brands/notes/perfumers, finder — all reading via Prisma, using the carried-over prototype UI. Real images.
- **P2 — Cart + checkout (no payment capture).** Cart, address (uz-regions), delivery quote, order creation.
- **P3 — Payments.** Payme + Click (then Uzum), idempotent webhooks, order state machine.
- **P4 — Delivery integrations.** Yandex/BTS/Express24 shipment + status.
- **P5 — Telegram.** Auth, bot notifications, mini-app surface.
- **P6 — Admin.** Catalog/orders/campaigns management; retire the Spree admin.
- **P7 — Cutover.** Final ETL re-sync, DNS, decommission Rails.

---

## 10. Risks

- **ETL fidelity** (translations, accord weights/colors, notes pyramid layers, image blobs). Mitigate with row-count parity + per-product spot checks and a dry-run report.
- **Image migration volume** (ActiveStorage → object storage) — plan storage + a re-runnable copy step; consider keeping Spree blob URLs temporarily.
- **Payments are revenue-critical** — never go live without sandbox testing each provider against the idempotency table; keep Spree able to take orders until P3 is proven.
- **Order history**: deciding whether to migrate live orders/customers vs catalog-only changes scope (see open questions).
- **Auth migration**: Telegram users map cleanly via `telegramId`; any password/staff accounts need a reset flow.
- **Scope creep**: bebio has CRM/Instagram/couriers/MoySklad — out of scope; resist pulling them in now.

---

## 11. Open questions (decide before P0)

1. **Repo location:** new top-level app in this monorepo (e.g. replace `apps/web` data layer in place) vs a brand-new repo? (Recommended: new app in-monorepo to reuse UI + tooling, delete `apps/backend` after cutover.)
2. **i18n storage:** per-locale JSON columns (recommended, simpler) vs dedicated translation tables (closer to Mobility). 
3. **Order/customer history:** migrate live orders + customers, or catalog + users only and start orders fresh?
4. **Image hosting:** migrate blobs to MinIO/S3 now, or keep serving existing Spree blob URLs during transition?
5. **Auth provider:** Auth.js Telegram + optional Eskiz OTP — confirm whether SMS login is wanted at launch.
6. **Payment providers at launch:** Payme + Click first (Uzum later), or all three from P3?
7. **Hosting target** (VPS/Docker vs a PaaS) — affects Postgres/Redis/MinIO + the grammy process setup.
