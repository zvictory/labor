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
| Telegram bot | grammy inside the app (`lib/telegram/`, webhook `app/api/telegram/webhook`)                            |
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

Do **not** start Docker, `npm run dev:all` / `scripts/dev.sh` (it brings up the Docker stack),
or the root `npm run dev` (turbo also starts the legacy `apps/web` and `apps/bot`).

## Legacy — not run locally

`apps/backend` (Spree/Rails), `apps/web` (Next.js 14 storefront for Spree), `apps/bot`,
`packages/*` and `infra/docker-compose.yml` are the earlier Spree stack. The store does not
call them at runtime; only `apps/store/scripts/etl` reads the Spree database (read-only,
`SPREE_DATABASE_URL`). `docs/architecture.md` maps this legacy stack only.

Production still runs in Docker on the VPS: `infra/deploy/deploy.sh` builds the compose
stack there. Never deploy without Zafar's approval.

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

- Don't use Docker locally or start the legacy apps.
- Don't add multi-currency.
- Don't bypass `resolveLocaleText` for catalog translations.
- Don't commit `.env`.
- Don't run `git add -A` — stage specific files.
