# Claude Code prompt — New architecture, Phase P0 (scaffold + schema + ETL)

Run on the real dev machine, at the repo root. This kicks off the Rails-free rebuild. **P0 only: scaffold the new app, finalize the Prisma schema, and migrate the catalog by ETL — no storefront wiring or payments yet.** Stop at the end of P0 for review before P1.

Prereq reading is mandatory and comes first. Do not write code until you've read all four.

---

```
You are starting a fresh, Rails-free rebuild of the Labor Parfum storefront: a single
Next.js 15 (App Router) + Prisma + Postgres app, built around the existing Labor prototype
design, with the real catalog migrated from the current Spree database by ETL. This task is
PHASE P0 ONLY — scaffold + schema + data migration. Do not build the storefront UI, payments,
delivery, or the bot yet.

STEP 0 — Read before writing any code:
1. CLAUDE.md (root) — conventions (npm workspaces, UZS integer minor units, ru/uz/en, Telegram-id
   auth, locale-prefixed routes). Note: the Spree/Rails backend is being RETIRED; keep its
   conventions only where they inform the data model.
2. docs/architecture.md — the current code map (so the ETL source tables are understood).
3. labor-redesign/new-architecture/ARCHITECTURE-AND-MIGRATION-PLAN.md — the governing plan.
   Follow its §2 architecture, §4–5 data model + ETL mapping, §9 roadmap, and §11 open questions.
4. labor-redesign/new-architecture/schema.prisma — the DRAFT schema to start from.
5. Skim the existing apps/web frontend (components/, src/i18n, ProductCard, fonts, formatUzs):
   this UI is REUSED later (P1); confirm what carries over.

STEP 1 — Confirm the open questions in the plan (§11) with the user before scaffolding if any are
unresolved. In particular: repo location (new app in this monorepo vs new repo), i18n storage
(per-locale JSON vs translation tables), and whether to migrate order/customer history or
catalog+users only. Do not guess on these — they change the schema and ETL scope.

STEP 2 — Scaffold (P0):
- Create the new app per the plan's §2 layout (recommended: a new app in this monorepo so the
  prototype UI + tooling are reusable; the Spree apps/backend is deleted only after cutover).
- Set up: Next.js 15 App Router, TypeScript strict, Tailwind with the existing Labor tokens
  (bone/ink/brass) and next/font/local for Story Script + Roboto Slab, next-intl (ru default,
  uz, en), Prisma, and a Docker compose for Postgres (+ Redis/MinIO if used).
- Add the draft schema.prisma, refine it to match the confirmed decisions, and generate the first
  migration. Do NOT hand-edit migrations; use prisma migrate.
- No new dependencies beyond what the stack requires; no fabricated data.

STEP 3 — ETL (scripts/etl/):
- Write a one-time, idempotent, READ-ONLY-source migration from the Spree Postgres DB into the new
  Prisma DB, following the plan's §5 table mapping exactly. Run loaders in FK order; upsert by
  natural keys (slug, telegramId, composite join keys).
- Collapse Mobility translation tables (labor_*_translations, spree_product_translations) into the
  per-locale JSON columns. Convert spree_prices.amount -> integer UZS minor units.
- Images: copy ActiveStorage blobs to object storage and record URLs (or, per the confirmed
  decision, temporarily reference existing Spree blob URLs). Make the image step re-runnable.
- Emit scripts/etl/etl-report.json with per-table source vs target counts.

STEP 4 — Verify ETL fidelity:
- Assert row-count parity per table (allowing for dropped soft-deleted rows).
- Spot-check 10–20 products end to end: name in ru/uz/en, notes pyramid (top/middle/base + order),
  accords with weights/colors, price (UZS int), images, brand, perfumer.
- Run prisma validate, tsc --noEmit on the new app, and the app's lint. All must pass.

STEP 5 — Do NOT (out of scope for P0):
- No storefront pages/UI wiring, no payments/delivery/bot, no admin, no checkout.
- No deletion of apps/backend yet (keep Spree intact and read-only for rollback).
- No CRM/Instagram/courier/MoySklad features from bebio.

STEP 6 — Commit intentional files only (never git add -A):
- Stage the new app scaffold, schema.prisma, migrations, ETL scripts, and the etl-report.
- Do NOT stage: .claude/, cache/, docs/superpowers/, unrelated labor-redesign prototype files,
  package-lock changes unless a real dependency was added (explain if so).
- Show git status --short and git diff --staged --stat before committing.
- Commit message: feat(app): scaffold Rails-free Next.js+Prisma app and migrate catalog (P0)

RETURN:
- new app location + structure
- final Prisma schema decisions vs the draft (what changed and why)
- ETL coverage: tables migrated, row counts (source vs target), images handled
- verification results (parity, spot-checks, prisma validate, typecheck, lint)
- anything that could not be migrated cleanly and why
- open questions answered vs still open
- readiness for P1 (storefront on real data)
```

---

### Reviewer notes (for the human)
- P0 is deliberately backend-only. The premium UI (prototype/Phase 1) gets wired to Prisma in **P1**, reusing the existing components — so expect P0 to produce a working DB + data, not visible pages.
- Keep Spree running and read-only until payments (P3) are proven; cutover/decommission is P7.
- Watch scope: bebio is a reference for Payme/Click/uz-regions/Eskiz/Playwright only — its CRM/Instagram/courier modules are out of scope.
- The planning sandbox could not run Next (SWC bus error); all build/test/QA happens on the dev machine.
