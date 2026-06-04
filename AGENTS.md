# Labor — Project Rules

Multi-brand fragrance ecommerce for Uzbekistan. Spree (Rails) backend + Next.js storefront + Telegram bot, all in a single monorepo.

## Stack

| Layer | Tech |
|---|---|
| Backend | Rails 7.1 + Spree 5.4 + Postgres 15 + Redis 7 + Sidekiq |
| Web | Next.js 14 App Router + TS strict + Tailwind + shadcn/ui (new-york) |
| Bot | grammy (Node TS) |
| State | Zustand (client), TanStack Query (server), Zod (schemas), React Hook Form |
| i18n | next-intl (web), mobility (Rails) — locales: ru, en, uz, uzc |
| Currency | UZS only |

## Repo layout

```
apps/{backend,web,bot}
packages/{api-client,ui,i18n,tg}
infra/{docker-compose.yml,nginx,deploy}
docs/plans/
```

Reference design: `docs/plans/2026-05-21-labor-parfum-design.md`.

## Conventions

- Package manager: **npm** (workspaces). Never bun/yarn/pnpm.
- Money fields: always `MoneyInput`, never raw `<Input type="number">`.
- TS strict. No `any`. Use `unknown` + narrowing, or `zod`.
- Prefer named exports over default exports.
- Currency: UZS, stored as integer minor units (UZS has no minor unit → 100 sum = 100).
- Locales: ru is default. URL prefix `/[locale]/...`. Catalog data via mobility.
- File:line references when discussing code.

## Telegram auth

`telegram_id` (bigint, unique) is the SOURCE OF TRUTH on `spree_users`. `email` is synthesized as `tg_{telegram_id}@labor.local`. Staff use Devise email/password at `/admin`.

## Payments

Each provider is a `Spree::PaymentMethod` subclass with a dedicated webhook controller. All webhooks are **idempotent** — store `(provider, external_txn_id)` in `payment_webhook_events`.

## Admin

- URL: `http://localhost:4000/admin/login` (backend port 4000)
- Default admin: `admin@labor.local`
- Reset password (writes a known value):
  ```bash
  docker exec labor-backend-1 bundle exec rails runner \
    'u = Spree::User.find_by(email: "admin@labor.local"); u.password = ENV["NEW_PWD"]; u.password_confirmation = ENV["NEW_PWD"]; u.save!; puts u.errors.full_messages.inspect'
  ```
  (pre-set `NEW_PWD` in the container env or use `docker exec -e NEW_PWD=...`).
- Admin role must be store-scoped in Spree 5.4 (`spree_role_users.resource_type='Spree::Store'`, `resource_id=Spree::Store.default.id`) — `has_spree_role?('admin')` defaults to `Spree::Store.current` and returns false otherwise.
- Spree 5.4 admin assets: Tailwind entry is `apps/backend/app/assets/tailwind/spree_admin.css`. Build with `docker exec labor-backend-1 bundle exec rails spree:admin:tailwindcss:build` (output: `app/assets/builds/spree/admin/application.css`, served by Propshaft as `/assets/spree/admin/application-<hash>.css`).
- Image management CLI (Edit Image modal Delete button is Turbo-confirm-driven; if it appears to do nothing, the JS confirm dialog was cancelled):
  - List: `docker exec labor-backend-1 bundle exec rake "labor:images:list[<slug>]"`
  - Delete: `docker exec labor-backend-1 bundle exec rake "labor:images:delete[<id>]"`
  Defined in `apps/backend/lib/tasks/labor_images.rake`.

## Spree 5.4 storefront API

- Spree 5.4 removed the `Spree::Api::V2` namespace. Labor's storefront routes still mount at `/api/v2/storefront/...`; a shim at `apps/backend/app/controllers/spree/api/v2/base_controller.rb` re-exposes `Spree::Api::V2::BaseController` as a subclass of `Spree::Api::V3::BaseController` (NOT `V3::Store::BaseController` — that one requires a publishable API key that apps/web and apps/bot don't send).
- Storefront/bot URL stability: keep new routes under `/api/v2/storefront/...` until/unless a deliberate V3 migration is planned.

## Don'ts

- Don't add multi-currency.
- Don't use Spree's default storefront (it's disabled).
- Don't bypass mobility for catalog translations.
- Don't commit `.env`.
- Don't run `git add -A` — stage specific files.
