# Labor — Project Rules

Multi-brand fragrance ecommerce for Uzbekistan (laborparfum.com). The product is a single
Next.js app, `apps/store`, with its own Postgres database through Prisma.
Develop it as a plain Next.js app — **no Docker locally.**

## Stack

| Layer        | Tech                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| App          | `apps/store` — Next.js 15 App Router + React 19 + TS strict + Tailwind v4                              |
| Data         | Prisma 5 + Postgres, database `labor_store`; schema `apps/store/prisma/schema.prisma`                  |
| Auth         | NextAuth v5 (`lib/auth/config.ts`): Telegram login, Telegram WebApp, phone OTP, staff email + password |
| Payments     | Click and Payme route handlers under `app/api/payments/`                                               |
| Telegram bot | Live bot: `apps/bot` (grammy, connected to Billz). The store sends messages with `lib/telegram/`; its `app/api/telegram/webhook` gets no updates |
| i18n         | next-intl — locales ru, en, uz; ru is the default                                                      |
| Validation   | Zod                                                                                                    |
| Tests        | Vitest (unit), Playwright (`e2e/`)                                                                     |
| Currency     | UZS only                                                                                               |

## Where things live (`apps/store`)

| Path                       | What                                                            |
| -------------------------- | --------------------------------------------------------------- |
| `app/[locale]/(store)/`    | storefront pages                                                |
| `app/[locale]/admin/`      | admin: catalog, orders, campaigns (guard: `lib/admin/guard.ts`) |
| `app/api/`                 | auth, cart, delivery quote, payments, Telegram webhook          |
| `lib/catalog/`             | catalog queries, DTOs, locale resolution                        |
| `messages/{ru,en,uz}.json` | UI strings                                                      |
| `scripts/`                 | one-off scripts, run with `npx tsx`                             |

Reference design: `docs/plans/2026-05-21-labor-parfum-design.md`.

## Running locally — no Docker

| What       | How                                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Postgres   | Homebrew `postgresql@16` on `localhost:5432` (`brew services start postgresql@16`). `psql` is not on PATH: `/opt/homebrew/opt/postgresql@16/bin/psql` |
| Env        | `apps/store/.env` — `DATABASE_URL` points at the local `labor_store`                                                                                  |
| Dev server | `npm run dev -w apps/store` → http://localhost:3012 (`PORT_STORE` overrides). Stop with Ctrl-C                                                        |
| Checks     | `npm run typecheck -w apps/store`, `npm test -w apps/store`                                                                                           |

Do **not** start Docker locally: `infra/docker-compose.yml` is the production stack.

## Production

The VPS runs Docker: `store`, `postgres`, `bot` and `nginx` (`infra/docker-compose.yml`).
`infra/deploy/deploy.sh`, run from the Mac, builds and migrates there and fails unless `/ru`
answers 200. Never deploy without Zafar's approval.

- The live Telegram bot, @laborparfum_bot, is `apps/bot` (grammy), connected to Billz
  (labor.billz.io). Don't touch it: keep its container and nginx's `/telegram/webhook`
  route, and never call `setWebhook` or change its webhook from a script, the deploy or the
  store. The bot registers `TELEGRAM_WEBHOOK_URL` itself on start. The store's own bot code
  (`lib/telegram/`, `/api/telegram/webhook`) uses the same token only to send messages.

- Product photos are the files behind the `/storage/...` URLs in the catalog: the Docker
  volume `labor_backend_storage`, served by nginx. Declared `external`, never remove it.
- The Postgres container also keeps the old Spree database (`POSTGRES_DB`, labor_production).
  Nothing reads it at runtime; only `apps/store/scripts/etl` can (`SPREE_DATABASE_URL`).
- The earlier Spree stack (Rails, the Next.js 14 storefront, `packages/*`, Redis, Sidekiq) was removed from the repository; it is in git history if ever needed.
- Catalog source files (Billz export, Parfumo data, image manifest) are in `data/catalog/`.

## Conventions

- Package manager: **npm** (workspaces). Never bun/yarn/pnpm.
- Money fields: always `MoneyInput`, never raw `<Input type="number">`. (Rule is aspirational — `MoneyInput` is not yet implemented in `apps/store`. When adding the first money input, build it per the global rule.)
- TS strict. No `any`. Use `unknown` + narrowing, or `zod`.
- Prefer named exports over default exports.
- Currency: UZS, stored as integer minor units (UZS has no minor unit → 100 sum = 100).
- Locales: ru is default. URL prefix `/[locale]/...`. Catalog translations are Prisma `Json` fields `{ ru, uz, en }`, read through `resolveLocaleText` (`lib/catalog/locale.ts`).
- File:line references when discussing code.

## Users and auth

`telegramId` (BigInt, unique) on `User` is the SOURCE OF TRUTH for Telegram users; `email` may be synthesized as `tg_{telegramId}@labor.local`. `role` is `customer | staff | admin`; staff and admin sign in with email + password (`passwordHash`).

## Payments

Click and Payme each have their own route handlers. All webhooks are **idempotent** — every event is stored in `PaymentWebhookEvent`, unique on `(provider, externalTxnId, eventType)`.

## Admin

- URL: http://localhost:3012/ru/admin — `staff` and `admin` roles enter; `admin` also passes `isAdmin()` (`lib/admin/guard.ts`).
- Create or promote a staff user (the password goes only through the environment):
  ```bash
  cd apps/store && STAFF_EMAIL=admin@labor.local STAFF_PASSWORD=… npx tsx scripts/create-staff-user.ts
  ```

## Don'ts

- Don't use Docker locally.
- Don't add multi-currency.
- Don't bypass `resolveLocaleText` for catalog translations.
- Don't commit `.env`.
- Don't run `git add -A` — stage specific files.
