# Labor — Multi-brand Fragrance Ecommerce (UZ)

**Date:** 2026-05-21
**Status:** Approved design, scaffolding in progress
**Owner:** zafar

---

## 1. Goal

Build a premium multi-brand parfumerie ecommerce platform for the Uzbekistan market with deep Telegram integration (auth + mini-app), Fragrantica-style rich product detail pages, and local payment/delivery integrations.

**Success criteria for v1 launch:**
- Public website at `labor.uz` (placeholder) and Telegram mini-app share one codebase.
- Customers can browse, register via Telegram, add to cart, checkout, pay with Click/Payme/Uzum/COD, and receive order updates in Telegram.
- Admin can manage catalog (Spree Admin), promo codes, campaigns, view/fulfill orders.
- All UI in 4 locales: ru, en, uz (Latin), uzc (Cyrillic). Currency: UZS only.
- Product pages show notes pyramid, accords with %, season/longevity/sillage votes, similar fragrances, compare drawer.

---

## 2. Architecture

**Style:** Headless commerce. Spree (Rails) serves as the backend (catalog, orders, admin, API). Next.js serves as the unified storefront for both the public website and the Telegram mini-app (routed under `/tg/*`).

```
                     ┌────────────────────────────┐
        ┌───────────▶│   Next.js (apps/web)       │
        │            │   - / public website       │
 Users  │            │   - /tg Telegram mini-app  │
 (web)  │            │   - SSR + RSC + RQ cache   │
        │            └──────────┬─────────────────┘
        │                       │ JSON
 TG     │                       ▼
 users  │            ┌────────────────────────────┐
        │            │  Spree Rails (apps/backend)│
        │            │  - Storefront API v2       │
        │            │  - Platform API            │
        │            │  - Custom: fragrance,      │
        │            │    votes, TG auth, payments│
        │            │  - Spree Admin (ERB)       │
        │            └──────────┬─────────────────┘
        │                       │
        │            ┌──────────┴─────────────────┐
        │            │ Postgres │ Redis │ Sidekiq  │
        │            └──────────────────────────────┘
        │
        │   Telegram updates (webhook)
        └────────────┐
                     ▼
            ┌────────────────────────┐
            │  Bot (apps/bot grammy) │
            │  - commands            │
            │  - order notifications │
            │  - broadcasts          │
            └────────────────────────┘
```

**Why headless:** Spree's default ERB storefront cannot realistically deliver Fragrantica-quality UX or share code with a Telegram mini-app. Headless decouples UX velocity from Rails release cadence.

**Why one Next.js app (not two):** The mini-app and website share ~90% of components (PDP, cart, checkout, search). Splitting into two apps doubles routing, build, and i18n work for marginal isolation benefit. `/tg/*` routes detect `window.Telegram.WebApp` and switch layout/controls.

---

## 3. Repo Layout

```
labor/
├── apps/
│   ├── backend/          # Rails 7 + Spree 4.x
│   ├── web/              # Next.js 14 App Router (website + /tg mini-app)
│   └── bot/              # grammy Telegram bot (Node TS)
├── packages/
│   ├── api-client/       # TS types + fetcher for Spree APIs
│   ├── ui/               # Shared shadcn components
│   ├── i18n/             # ru/en/uz/uzc messages
│   └── tg/               # Telegram WebApp helpers (initData verify, theme)
├── infra/
│   ├── docker-compose.yml
│   ├── nginx/
│   └── deploy/           # Contabo deploy scripts
├── docs/plans/
├── package.json          # npm workspaces + turbo
├── turbo.json
├── tsconfig.base.json
└── CLAUDE.md             # Project rules
```

**Build orchestration:** Turborepo + npm workspaces. Backend (Rails) sits in the monorepo but is built/run via its own Dockerfile — Turbo only orchestrates TS apps.

---

## 4. Tech Stack

### Backend (apps/backend)
| Concern | Choice |
|---|---|
| Framework | Rails 7.1, Ruby 3.3 |
| Commerce | Spree 4.x (core, api, admin, sample). Storefront gem disabled. |
| DB | PostgreSQL 15 |
| Cache/queue | Redis 7 + Sidekiq 7 |
| Auth (admin) | Devise (built-in to Spree) |
| Auth (API) | Custom telegram-oauth → JWT (extends `spree_oauth`) |
| i18n | mobility 1.x (jsonb backend) for translatable catalog fields |
| Storage | ActiveStorage on disk (v1), S3-compatible later |
| Image processing | image_processing + vips |

### Frontend (apps/web)
| Concern | Choice |
|---|---|
| Framework | Next.js 14 App Router, TS strict |
| Styling | Tailwind + shadcn/ui (new-york) |
| Client state | Zustand |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| i18n | next-intl (App Router) |
| Dates | date-fns |
| Money input | MoneyInput (per global rule) |
| Maps | Leaflet + OSM tiles (for pickup points) |

### Bot (apps/bot)
| Concern | Choice |
|---|---|
| Framework | grammy + grammy-runner |
| Storage | Redis (sessions, deep-link tokens) |
| Webhooks | Inbound from Telegram, outbound from Rails (RabbitMQ-less: direct HTTP) |

---

## 5. Fragrance Domain Model

Spree's `Product`/`Variant` stay as-is. Fragrance-specific data lives in attached models so we never patch core Spree tables.

```ruby
# Brand has_many products (replaces/wraps Spree::Taxon "Brands" taxonomy)
Brand(id, slug, name_i18n, logo, country, founded_year)

Perfumer(id, slug, name_i18n, bio_i18n, photo)

Note(id, slug, name_i18n, image, category_hint) # category_hint: top/heart/base
Accord(id, slug, name_i18n, color_hex)          # for stacked bars

ProductFragranceDetail(
  product_id PK FK,
  gender enum(unisex, men, women),
  concentration enum(parfum, edp, edt, edc, extrait, oil),
  year_released int,
  longevity_hint enum,
  sillage_hint enum
)

ProductPerfumer(product_id, perfumer_id, position)
ProductNote(product_id, note_id, category enum(top, heart, base), position)
ProductAccord(product_id, accord_id, percentage decimal) # for bars
SimilarProduct(product_id, similar_product_id, editorial_position)

Vote(
  id,
  user_id,                # Spree::User
  votable_type, votable_id, # Spree::Product
  dimension enum(rating, longevity, sillage, season, time_of_day, love_hate),
  value string,           # 'love'/'like'/'winter'/'4-6h'/'4'/etc — normalized per dimension
  created_at,
  unique(user_id, votable_id, dimension)
)

ProductVoteAggregate(            # denormalized for fast PDP read
  product_id, dimension, value, count, updated_at
)
```

**Indexes:**
- `votes(votable_id, dimension)`
- `product_notes(product_id, category, position)`
- `brand(slug)`, `perfumer(slug)`, `note(slug)`, `accord(slug)` unique

**Aggregation:** A Sidekiq job recomputes `product_vote_aggregates` on vote insert/update, debounced to once per product per 5s. PDP reads aggregates only — never `SUM()` votes live.

**Storefront API extension:** `GET /api/v2/storefront/products/:slug` is overridden to include a `fragrance` block with notes pyramid, accords, perfumers, votes aggregate, similar products. Locale resolved from `Accept-Language`.

---

## 6. Authentication

**Customers — Telegram only**

| Surface | Method |
|---|---|
| Web | Telegram Login Widget (HMAC verified server-side) |
| Mini-app | `Telegram.WebApp.initData` (HMAC verified server-side) |

Flow:
1. Client posts `auth_data` to `/api/auth/telegram/{widget|initdata}` (Next.js route).
2. Next.js verifies HMAC with `BOT_TOKEN`, rejects if invalid or older than 5 min.
3. Next.js calls Rails `POST /spree_oauth/telegram` with `telegram_id`, `first_name`, `username`, `photo_url`.
4. Rails finds-or-creates `Spree::User` keyed by `telegram_id`, returns OAuth-style access token.
5. Next.js sets `__Host-session` httpOnly Secure cookie with the token; sends to client.

**Staff — Devise email/password**

Standard Spree Admin at `/admin` uses Devise; never exposed to customers.

**Spree::User additions:**
```ruby
add_column :spree_users, :telegram_id, :bigint, index: { unique: true }
add_column :spree_users, :telegram_username, :string
add_column :spree_users, :telegram_photo_url, :string
add_column :spree_users, :preferred_locale, :string, default: 'ru'
```

`telegram_id` is the source of truth. `email` is nullable; we synthesize `tg_{telegram_id}@labor.local` so Devise validations pass without leaking PII.

---

## 7. Payments

All four methods are Spree `PaymentMethod` subclasses. Each registers a webhook controller under `Spree::Api::Payments::{provider}`.

| Method | Type | Notes |
|---|---|---|
| Click | Custom gateway | Click Pass (QR/USSD) + Click Merchant API. Webhooks: `prepare` (validate), `complete` (capture). UZS minor units = sum. |
| Payme | JSON-RPC | Implement: CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction, CheckTransaction, GetStatement. Auth: HTTP Basic with `Paycom:KEY`. |
| Uzum Bank | REST API | Quote → Create → Capture; webhook signed with HMAC-SHA256. |
| Cash on delivery | Spree built-in `check` | No external integration. Confirmed by courier dashboard. |

**Idempotency:** Every webhook endpoint stores `(provider, external_txn_id)` in `payment_webhook_events` and rejects duplicates. Money never moves twice.

**Currency:** Spree configured with UZS only. No multi-currency in v1. All `Money` amounts stored as integer minor units (UZS has none, so `100 sum = 100`).

**Reconciliation:** Nightly Sidekiq job pulls statement endpoints from each provider and matches against `Spree::Payment.completed`. Discrepancies file an admin notice.

---

## 8. Delivery

Spree `ShippingMethod` per provider. Adapters implement a `Labor::ShippingAdapter` interface: `quote(order, address) → [{eta, price_uzs, service_code}]`, `create_claim(order) → {claim_id, tracking_url}`, optional `cancel_claim`.

| Provider | API maturity | v1 plan |
|---|---|---|
| Yandex Delivery (yandex.uz) | Documented REST | Full integration — quotes at checkout, claim on order completion, status webhook. |
| Express24 | Public API | Quote + create + webhook. |
| BTS | No public API | v1: order CSV export from admin (manual upload to BTS dashboard). Track API access for v2. |

**Pickup points** (Yandex): Leaflet map in checkout, points fetched via Yandex Delivery `pickup-points` endpoint, cached 1h in Redis. Selected `pickup_point_id` stored on `Spree::Order#shipment_metadata` (jsonb).

---

## 9. Internationalization

**Locales:** ru (default), en, uz (Latin), uzc (Cyrillic).

**UI strings:** `next-intl` with messages in `packages/i18n/messages/{locale}.json`. Locale prefix in URL (`/ru`, `/en`, `/uz`, `/uzc`). Default redirect by `Accept-Language` cookie.

**Catalog data:** Mobility gem on Rails. Translatable fields: `Brand.name`, `Brand.description`, `Note.name`, `Accord.name`, `Spree::Product.name`, `Spree::Product.description`, `Perfumer.name`, `Perfumer.bio`. Stored in `mobility_string_translations` + jsonb columns on each model for performance.

**Currency formatting:** Always UZS, grouped by locale per CLAUDE.md MoneyInput rule.

---

## 10. Reviews, Promos, Campaigns

**Reviews:** Spree review extension OR custom: `Review(user, product, rating 1-5, body_i18n, photos, status: pending/approved/rejected, helpful_count)`. Photo uploads via ActiveStorage. Moderation queue in admin. Only verified buyers can submit.

**Promo codes:** Spree's promotion engine — already supports codes, % off, fixed off, free shipping, BOGO. Just expose in admin.

**Campaigns:** New model `Campaign(slug, title_i18n, hero_image, body_i18n, product_list[], starts_at, ends_at, active)`. Renders at `/campaigns/[slug]`. Admin tab in Spree Admin. Telegram broadcast button triggers a `BroadcastCampaignJob` that sends the campaign URL to all opted-in TG users.

---

## 11. Cross-sell / Up-sell / Compare / Wishlist

| Feature | Source |
|---|---|
| Up-sell | Spree `product_promotions` + new `Product.upsells[]` editorial list (admin). |
| Cross-sell | Spree's `related_products` association. |
| Similar fragrances | Editorial `SimilarProduct` table (admin manages) — algorithmic v2. |
| Compare drawer | Client-side store (Zustand), up to 4 products, table of notes/accords/price/ratings. |
| Wishlist | Spree `Spree::Wishlist` (built-in). Heart button on PDP. Guest wishlist in localStorage merged on login. |

---

## 12. Telegram Bot

`apps/bot` (grammy, TS):

**Commands:**
- `/start` — welcome, deep-link parser (`/start product_123` → mini-app PDP).
- `/orders` — list user's recent orders with mini-app links.
- `/help` — FAQ + contact.

**Buttons:**
- Persistent reply keyboard with "🛒 Магазин" → launches mini-app at `/`.

**Notifications** (Rails → Bot via internal HTTPS):
- Order placed → message with order summary + tracking link.
- Order shipped → message with carrier + tracking URL.
- Order delivered → message asking for review.
- Campaign broadcast.

**Mini-app integration in `apps/web/app/tg/*`:**
- Detects `window.Telegram.WebApp`, calls `.ready()`, `.expand()`.
- Reads `themeParams` and applies to Tailwind CSS variables.
- `MainButton` shows "Перейти к оплате" on cart/checkout pages.
- `BackButton` mirrors browser back.
- `HapticFeedback` on add-to-cart, checkout, review submit.

---

## 13. Fiscal / Tax (v1 stub)

`FiscalReceipt(order_id, provider, provider_doc_id, pdf, status, issued_at)`.

Adapter interface:
```ruby
class FiscalProvider
  def issue(order) → FiscalReceipt
  def cancel(receipt) → FiscalReceipt
end
```

v1: `ManualFiscalProvider` generates a PDF receipt (Prawn) with order details + VAT line. v2 swaps in `MulticardOfdProvider` or `SoliqservisProvider`.

**Tax:** Single `Spree::TaxRate` of 12% (UZ VAT) applied to all parfum SKUs via tax category "Parfumerie".

---

## 14. Brand & Visual Direction

**Brand:** "Labor" — multi-brand parfumerie. Logo provided as `logo.ai`. Working directory `lelabo-clone/` indicates the brand visual aspires to Le Labo's editorial brutalist style.

**Typography:**
- Display: **Story Script** (provided, italic display face) — used for hero headlines and brand wordmark accents.
- Body / UI: **Roboto Slab** (provided) — all text content, navigation, prices.
- Fallback: system serif → `Georgia, serif`.

**Palette** (Le Labo-inspired, refined for parfum):
- Background: `#FAF8F4` (warm bone)
- Surface: `#FFFFFF`
- Ink (primary text): `#1A1714` (near-black)
- Muted ink: `#6B6258`
- Accent: `#8B6F47` (warm brass — matches Tom Ford gold)
- Danger: `#9B2C2C`

**Layout cues** (from Fragrantica reference screenshots):
- Dark variant of PDP exists — toggleable theme.
- Accords as full-bleed stacked horizontal bars with note color + label.
- Pyramid section: 3 rows (top/heart/base), note thumbnails in circles with label below.
- Vote sections boxed with dark surface + emoji-icon labels.
- Similar fragrances: horizontal scroll cards with mini-bottle + brand label + rating + compare link.

---

## 15. Deployment

**Target:** Contabo VPS (Germany), Docker Compose.

**Services in docker-compose:**
- `postgres:15` (named volume)
- `redis:7-alpine`
- `backend` (Rails puma, port 3000) — built from `apps/backend/Dockerfile`
- `sidekiq` (Rails worker) — same image, different command
- `web` (Next.js, port 3001) — built from `apps/web/Dockerfile`
- `bot` (Node, no port) — built from `apps/bot/Dockerfile`
- `nginx` (80/443, LE certbot sidecar) — proxies labor.uz → web, /admin and /api → backend, /tg-webhook → bot

**Secrets:** `.env` file outside repo, mounted read-only. `.env.example` committed.

**CI/CD:** GitHub Actions builds images, pushes to GHCR. Deploy script `infra/deploy/deploy.sh` SSHes to VPS, `docker compose pull && up -d` with `--no-build`. Zero-downtime via nginx + healthchecks.

**Backups:** `pg_dump` nightly Sidekiq cron to S3-compatible bucket (Backblaze B2 or DO Spaces).

---

## 16. Phasing & Estimated Effort

| Phase | Scope | Estimate (eng-weeks) |
|---|---|---|
| 0 | Scaffolding, brand setup, design tokens, base UI | 1 |
| 1 | Spree backend + fragrance schema + Telegram auth | 2 |
| 2 | Storefront PDP, listing, cart, search, i18n | 2 |
| 3 | Checkout, payments (Click + Payme), Yandex delivery | 3 |
| 4 | Telegram bot + mini-app polish | 1 |
| 5 | Promos, reviews, compare, wishlist | 1 |
| 6 | Uzum payments, Express24, fiscal stub, BTS export | 2 |
| 7 | Deploy infra, monitoring, soft launch | 1 |

**Total v1: ~13 eng-weeks** for a single engineer working full-time. Real calendar time depends on resources.

---

## 17. Non-goals (explicit YAGNI)

- ❌ No multi-currency (UZS only)
- ❌ No mobile native apps (mini-app + responsive web cover this)
- ❌ No subscriptions / recurring orders (rare in parfum)
- ❌ No marketplace / vendor onboarding
- ❌ No real-time chat (Telegram itself serves this purpose)
- ❌ No algorithmic recommender — editorial only in v1
- ❌ No CRM email — Telegram messages cover engagement

---

## 18. Open questions

These do not block scaffolding:

1. Final domain (labor.uz? other TLD?)
2. Stripe-style accounting export format for bookkeeper
3. Whether to ship Spree default sample data or seed with real Tom Ford / Le Labo / etc product list immediately
4. Photography pipeline: stock bottle images vs in-house shoots
5. Customer support SLA + Telegram group vs direct DMs to staff bot
