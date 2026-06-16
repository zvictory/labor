# @labor/store

The new Rails-free **Next.js 15 + Prisma + Postgres** storefront for Labor Parfum
(Uzbekistan niche perfumery). Replaces the Spree/Rails backend; a single Next.js
App Router app owns UI, server data access (Prisma), API route handlers, and i18n.

See the governing plan:
`labor-redesign/new-architecture/ARCHITECTURE-AND-MIGRATION-PLAN.md`.

> **Build / QA must run on a real dev machine.** The planning sandbox cannot run
> Next.js — its SWC binary hits a bus error. Do not attempt `next build`,
> `next dev`, or Playwright inside the sandbox; run them locally.

## Stack

- **Next.js 15** App Router (RSC-first), React 19, TypeScript strict (no `any`).
- **Tailwind v4** (`@tailwindcss/postcss`) with the Labor `bone / ink / brass`
  tokens and shadcn-style CSS variables.
- **next-intl** — locales `ru` (default), `uz`, `en`; routes are `/[locale]/...`.
- **Fonts** via `next/font/local`: Roboto Slab (body) + Story Script (display).
- **Prisma** + Postgres 15. **Redis 7** + **MinIO** (S3) via Docker for dev.
- Money is **UZS integer minor units (so'm)** — no decimals, single currency.

## Layout (this app)

```
apps/store/
├─ app/
│  ├─ layout.tsx              root layout (fonts, globals.css)
│  ├─ globals.css             Tailwind v4 entry + Labor CSS variables
│  └─ [locale]/layout.tsx     locale validation + NextIntlClientProvider
├─ i18n/{config.ts,request.ts}
├─ messages/{ru,uz,en}.json   UI strings (carried from apps/web)
├─ lib/fonts.ts               next/font/local setup
├─ public/fonts/*.ttf         font binaries + licenses
├─ middleware.ts              next-intl locale routing
├─ infra/docker-compose.yml   dev Postgres + Redis + MinIO
├─ tailwind.config.ts  postcss.config.mjs  next.config.mjs  tsconfig.json
└─ .env.example
```

> Schema (`prisma/`), data access (`lib/db.ts`, `lib/catalog/*`, `lib/money.ts`),
> ETL (`scripts/etl/*`), UZ subsystems (payments / delivery / SMS / telegram),
> and UI components are owned by other agents and land in this same app.

## Import alias

`@/*` resolves to the app root (`apps/store/*`) — e.g. `@/i18n/config`,
`@/lib/fonts`. `baseUrl` is `.` and `tsconfig.json` maps `"@/*": ["./*"]`.

## Running on your dev machine

1. **Install deps** (from the monorepo root — npm workspaces):
   ```bash
   npm install
   ```
   > ⚠ The root `package.json` `workspaces` array does not yet list
   > `apps/store`. Add `"apps/store"` to it (or switch to an `apps/*` glob)
   > before installing, otherwise this app is not part of the workspace.

2. **Configure env**:
   ```bash
   cp apps/store/.env.example apps/store/.env
   # fill in secrets; defaults match the Docker infra below
   ```

3. **Start dev infra** (Postgres + Redis + MinIO):
   ```bash
   docker compose -f apps/store/infra/docker-compose.yml up -d
   ```
   - Postgres: `localhost:5432` (db `labor_store`, user/pass `labor`)
   - Redis: `localhost:6379`
   - MinIO: API `localhost:9000`, console `localhost:9001` (`minioadmin`/`minioadmin`)

4. **Run Prisma migrations** (once the schema lands):
   ```bash
   npm run -w @labor/store exec prisma migrate dev
   ```

5. **Run the app** (port `3002`):
   ```bash
   npm run -w @labor/store dev
   ```
   Open http://localhost:3002 → redirects to `/ru`.

## Scripts

| Script | Does |
|---|---|
| `dev` | `next dev -p 3002` |
| `build` | `next build` |
| `start` | `next start -p 3002` |
| `lint` | `next lint` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` |
| `test:e2e` | `playwright test` |

## Notes

- Port is **3002** to avoid colliding with `apps/web` (`3001`) and `apps/bot` (`8080`).
- Story Script is Latin-only; RU/UZ headings fall back to Georgia (handled in the
  Tailwind `display` font stack).
