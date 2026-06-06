# Labor — Architecture Map

Navigable code map. Read this before grepping for where something lives.
All paths are relative to repo root.

---

## Backend — `apps/backend`

### Directory layout

```
app/
  assets/tailwind/spree_admin.css          # Spree admin Tailwind entry
  controllers/
    spree/api/v2/base_controller.rb        # V3 shim (see Spree 5.4 gotcha)
    spree/api/v2/storefront/               # storefront API controllers (see table)
    labor/storefront/                      # non-API storefront (products, account, votes)
    labor/admin/                           # Labor admin (brands, notes, perfumers)
  models/
    labor/                                 # domain models
    spree/user.rb                          # telegram_id source of truth
    spree/*_decorator.rb                   # Spree model decorators
  serializers/labor/storefront/            # JSON serializers (product_serializer reads Mobility)
  services/labor/                          # business logic
  workers/labor/                           # Sidekiq workers
config/
  initializers/mobility.rb                # backend: :table, plugins, fallbacks
  application.rb                          # available_locales: [ru, en, uz], default: ru
lib/tasks/                                # labor_*.rake (13 files)
db/
  schema.rb
  migrate/                                # Spree + labor migrations
```

### Storefront API controllers — `app/controllers/spree/api/v2/storefront/`

| Controller | Serves |
|---|---|
| `brands_controller.rb` | Brand listing/detail (mobility-translated) |
| `notes_controller.rb` | Fragrance notes |
| `perfumers_controller.rb` | Perfumer listing/detail |
| `search_controller.rb` | Product search |
| `filter_facets_controller.rb` | Filter facet options |
| `catalog_map_controller.rb` | Catalog facet/taxonomy map |
| `checkout_controller.rb` | Checkout flow |
| `account_locale_controller.rb` | Update user preferred locale |
| `telegram_auth_controller.rb` | Telegram login → token issuance |
| `campaigns_controller.rb` | Marketing campaigns/slides |
| `payments/click_controller.rb` | Click payment webhook |
| `payments/payme_controller.rb` | Payme payment webhook |
| `payments/uzum_controller.rb` | Uzum payment webhook |
| `delivery/bts_controller.rb` | BTS delivery quotes/labels |
| `delivery/express24_controller.rb` | Express24 delivery |
| `delivery/yandex_controller.rb` | Yandex delivery |

### Payments

Providers are **STI by `type:` string only** — `Labor::PaymentMethod::{Click,Payme,Uzum}`.
**No source class file exists** in `apps/backend`; resolved at runtime via
`Spree::PaymentMethod.find_by(type:)` / `find_by(name:)` from DB-seeded records.

| Provider | Webhook controller | URL builder service | Verify service |
|---|---|---|---|
| Click | `storefront/payments/click_controller.rb` | `services/labor/payments/click/prepare_url.rb` | `services/labor/payments/click_verifier.rb` |
| Payme | `storefront/payments/payme_controller.rb` | `services/labor/payments/payme/prepare_url.rb` | — |
| Uzum | `storefront/payments/uzum_controller.rb` | `services/labor/payments/uzum/prepare_url.rb` | — |

**Idempotency:** `app/models/labor/payment_webhook_event.rb` — `.record!(provider:, external_txn_id:, event_type:, payload:)`.
Unique index `idx_pwe_idempotency` on `[provider, external_txn_id, event_type]`.

### Telegram auth / user provisioning

| File | Role |
|---|---|
| `app/models/spree/user.rb` | `telegram_id` is source of truth |
| `app/models/spree/user_decorator.rb` | `telegram_id` uniqueness, `via_telegram` scope, `telegram?`/`display_name` |
| `app/services/labor/telegram_user_provisioner.rb` | `find_or_initialize_by(telegram_id:)`, synthesizes `tg_#{id}@labor.local` email |
| `app/services/labor/telegram_auth.rb` | Telegram login-data HMAC verification |
| `app/controllers/spree/api/v2/storefront/telegram_auth_controller.rb` | Wires provisioner → token |
| `app/services/labor/telegram/internal_notify_client.rb` | Outbound notify to bot |
| `app/models/spree/order_decorator.rb` | Pushes status to Telegram on order state change |

### Model decorators — `app/models/spree/`

| Decorator | What it adds |
|---|---|
| `order_decorator.rb` | `has_one :labor_fiscal_receipt`; after_update → fiscal receipt + Telegram status push |
| `product_decorator.rb` | Associations to fragrance_detail, notes/accords/perfumers; `missing_images` scope |
| `shipment_decorator.rb` | `delivery_provider` validation; `delivery_provider_display`, `trackable?` |
| `user_decorator.rb` | telegram_id uniqueness; `preferred_locale` inclusion (ru/en/uz); votes/wishlist associations |

### Mobility (catalog translations)

- Config: `config/initializers/mobility.rb` — `backend :table`
- Locales in `config/application.rb`: available `[ru, en, uz]`, default `ru`,
  fallbacks `uz→[ru,en]`, `en→[ru]`, `ru→[en]`
- Translated models (all in `app/models/labor/`):

| Model | Translated attributes |
|---|---|
| `accord.rb` | `name` |
| `brand.rb` | `description`, `story` |
| `campaign.rb` | `title`, `subtitle`, `body`, `cta_label` |
| `campaign_slide.rb` | `title`, `subtitle`, `cta_label` |
| `note.rb` | `name`, `description` |
| `perfumer.rb` | `bio` |

- Read in: `app/serializers/labor/storefront/product_serializer.rb`

### Rake tasks — `lib/tasks/`

| File | Purpose |
|---|---|
| `labor_catalog.rake` | Import Billz catalog CSV → Spree::Product + Labor::Brand (idempotent) |
| `labor_megaseed.rake` | Seed ~100 brands, ~80 notes, ~40 perfumers, 1000 products (idempotent) |
| `labor_notes.rake` | Apply curated 4-locale note translations, set icon_url |
| `labor_clone_accords.rake` | Copy notes/accords from parent product to clone listings |
| `labor_clone_accords_v2.rake` | Clone into shower-gel/body-lotion/diffuser/cream variants by name |
| `labor_synthesize_accords.rake` | Synthesize ProductAccord rows from notes when Fragrantica data missing |
| `labor_seed_curated_accords.rake` | Seed curated accord profiles for ~60 unharvestable products |
| `labor_harvest.rake` | Fetch/parse Fragrantica URLs; resolve manifest IDs → URLs |
| `labor_ingest_fragrantica_harvest.rake` | Ingest harvest JSON; replace synthesized accords/notes; propagate to clones |
| `labor_ingest_brand_details.rake` | Ingest brand harvest JSON (description, story, country, founded_year) |
| `labor_ingest_product_details.rake` | Apply product detail JSON (en descriptions + accord weights/colors) |
| `labor_images.rake` | Attach images from manifests; also exposes `labor:images:list[slug]` / `labor:images:delete[id]` |
| `labor_storage.rake` | Migrate ActiveStorage blobs local→S3; delete local copies already on S3 |

---

## Web — `apps/web`

### App Router (`src/app`)

Two parallel UI trees under `src/app/[locale]/`:

| Tree | Path prefix | Purpose |
|---|---|---|
| Public storefront | `src/app/[locale]/(site)/` | Main ecommerce site |
| Telegram mini-app | `src/app/[locale]/tg/` | grammy WebApp surface |

Key `(site)` pages:

| Page | Path |
|---|---|
| Catalog / shop | `(site)/catalog/page.tsx`, `(site)/shop/page.tsx` |
| Search | `(site)/search/page.tsx` + `search-client.tsx` |
| Product | `(site)/product/[slug]/page.tsx` |
| Cart | `(site)/cart/page.tsx` + `cart-view.tsx` |
| Checkout | `(site)/checkout/page.tsx` |
| Account | `(site)/account/page.tsx`, `account/orders/page.tsx`, `account/orders/[number]/page.tsx` |
| Brands / Perfumers / Notes | `(site)/brands/[slug]`, `perfumers/[slug]`, `notes` |
| Campaigns | `(site)/campaigns/[slug]` |
| Telegram auth | `(site)/auth/telegram/page.tsx` |
| Compare / Wishlist | `(site)/compare`, `(site)/wishlist` |

### API client (`src/lib/api/`)

One file per domain:
`client.ts`, `products.ts`, `facets.ts`, `checkout.ts`, `account.ts`, `brands.ts`,
`perfumers.ts`, `notes.ts`, `search.ts`, `catalog-map.ts`

URL resolution in `src/lib/api/client.ts` (`apiFetch`):

| Context | Env var | Default |
|---|---|---|
| Server-side (SSR / RSC) | `INTERNAL_API_URL` | `http://localhost:3000` |
| Browser | `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api` |

All domain modules call `/api/v2/storefront/...` and validate responses against
`@labor/api-client/catalog` Zod schemas (`parseApiResponse` wrapper).

### State and validation

| Layer | Location |
|---|---|
| Zustand stores | `src/lib/stores/{cart,wishlist,compare}-store.ts` |
| TanStack Query provider | `src/providers/query-client-provider.tsx` (staleTime 30s) |
| Zod contracts | `packages/api-client` (shared with backend) |
| Format / display | `src/lib/format.ts` |

### Components

**No `components/ui/` shadcn directory.** Components are feature-organized under `src/components/`:
`catalog/`, `pdp/`, `compare/`, `finder/`, `home/`, `analytics/`, `telegram/`, `tg/` (back-button,
main-button, tab-bar, tg-add-to-cart, locale-switcher), plus `site-header.tsx`, `site-footer.tsx`.

**MoneyInput / NumberInput: not yet implemented.** Money display goes through
`src/lib/format.ts`. The MoneyInput rule is aspirational — no input component exists today.

### i18n

| File | Role |
|---|---|
| `src/i18n/request.ts` | next-intl request config |
| `src/middleware.ts` | Locale routing middleware |
| `src/i18n/messages/en.json` | English strings |
| `src/i18n/messages/ru.json` | Russian strings (default locale) |
| `src/i18n/messages/uz.json` | Uzbek strings |

Active locales: **ru, en, uz**. `uzc` (Cyrillic Uzbek) was removed in commit `f9de131`
— no `uzc.json` message file, not in `config/application.rb`. Do not add uzc strings
unless the locale is explicitly re-enabled.

---

## Bot — `apps/bot`

| File | Role |
|---|---|
| `src/index.ts` | Entry — builds `Bot<LaborContext>`, installs session, registers handlers, dual-server setup |
| `src/handlers/start.ts` | `/start`, `/help` commands; `handleStart`, `handleHelp` |
| `src/handlers/lang.ts` | `/lang` command; `handleLangChoose`, `handleLangSet` |
| `src/handlers/notify.ts` | Handles Spree→bot internal notifications (paid/shipped/delivered/channel) |
| `src/services/api.ts` | `fetch`-based API client → `LABOR_API_BASE_URL` (default `http://backend:3000/api/v2`) |
| `src/internalNotifyAuth.ts` | HMAC verification for `/internal/notify/*` endpoint |
| `src/i18n.ts` | `t(locale, key)` helper + `LocaleKey` type |
| `src/config.ts` | Env config |
| `src/middleware/session.ts` | grammy session setup |

**Dual server:** grammy bot (long-poll or webhook) + raw `node:http` server listening for
Spree→bot notifies at `/internal/notify/{paid,shipped,delivered,channel}`.

---

## Packages — `packages/`

| Package | State | Exports |
|---|---|---|
| `@labor/api-client` | **Active** | `./catalog` — Zod schemas + types: `productCardSchema`, `productSchema`, product list/detail response schemas, facet schemas. Consumed by `apps/web/src/lib/api/{products,facets}.ts`. |
| `@labor/ui` | **Empty stub** | Nothing — no `src/`. Each app has its own UI components locally. |
| `@labor/i18n` | **Empty stub** | Nothing — web uses `src/i18n/`, bot uses `src/i18n.ts` locally. |
| `@labor/tg` | **Empty stub** | Nothing — TG logic is local to `web/src/components/tg/` and `apps/bot`. |

Do not import from `@labor/ui`, `@labor/i18n`, or `@labor/tg` — they have no source.

---

## Cross-cutting gotchas

| Trap | Reality |
|---|---|
| Payment method classes | `Labor::PaymentMethod::{Click,Payme,Uzum}` have **no source file** — DB-seeded STI records only. Don't search for a class definition. |
| Spree V2 → V3 shim | `apps/backend/app/controllers/spree/api/v2/base_controller.rb` subclasses `V3::BaseController`, **not** `V3::Store::BaseController` (that one requires a publishable API key). Don't change this. |
| Storefront route prefix | Keep new routes under `/api/v2/storefront/...` — no deliberate V3 migration is planned. |
| `@labor/{ui,i18n,tg}` | Empty workspaces. Exist as future placeholders only. |
| uzc locale | Removed in `f9de131`. Backend config and web message files are `ru/en/uz` only. |
| MoneyInput | Mandated by rule but not yet built. No money `<Input>` component exists anywhere in `apps/web`. |
| web/bot in compose | `infra/docker-compose.yml` **does** define `web:` and `bot:` services, but they are **production builds** (no HMR). Day-to-day dev runs them on the host via `npm run dev:all`. Only postgres/redis/backend/sidekiq run in Docker during dev. |
| Starting the stack | `npm run dev:all` (from repo root) — see `CLAUDE.md § Running the stack` and `.claude/skills/run/SKILL.md`. |
