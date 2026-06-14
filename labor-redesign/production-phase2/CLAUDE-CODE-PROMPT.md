# Claude Code prompt — Phase 2: real-catalog homepage

Copy everything in the block below into Claude Code, running at the repo root on the **real dev machine** (where `next dev`/`next build` work). Do not run this in the Phase 1 sandbox — that environment hits an SWC/native Bus error and cannot run or build the app.

---

```
You are working in the Labor Parfum monorepo on the real dev machine. Goal: make the
redesigned homepage render REAL catalog data and REAL product imagery wherever the data
already exists, without changing the production architecture. This is an incremental
integration pass, not a rebuild.

STEP 0 — Read before touching anything (do not edit in this step):
1. Read CLAUDE.md (root) — conventions, run commands, don'ts.
2. Read docs/architecture.md — the code map (API controllers, web app-router, api client).
3. Read labor-redesign/production-phase2/TECH-SPECS-REAL-CATALOG-HOMEPAGE.md — the spec
   that governs this task. Follow its §3 audit, §4 requirements, §5 finder decision,
   §7 boundaries, and §8 commands exactly.
4. Read the current homepage and its sections:
   - apps/web/src/app/[locale]/(site)/page.tsx
   - apps/web/src/components/home/{finder-band,mood-browser,custom-parfum-cta,trust-strip,telegram-cta,hero-slider}.tsx
   - apps/web/src/components/catalog/product-card.tsx
   - apps/web/src/lib/api/{products,notes,brands}.ts and src/lib/format.ts

STEP 1 — Run the app locally:
- If a native Bus error / missing binary appears, run `npm install` at the repo root to
  fetch platform-correct @parcel/watcher and @next/swc binaries. Do NOT commit lockfile
  changes unless a dependency genuinely changed.
- Start the stack so the storefront API serves live catalog data:
  `npm run dev:all`  (Docker infra + web:3001 + bot:8080, per CLAUDE.md)
  If you only need the web app and the backend API is already reachable, you may use
  `npm --workspace @labor/web run dev` instead.
- Open http://localhost:3001/ru, /uz, /en and confirm the homepage loads with real products.

STEP 2 — Inspect with real data, then make ONLY these integration fixes (per the spec; the
backend has already been investigated — these are decisions, not options):
- Product grids (THE core change, in page.tsx): stop using `brand:'le-labo'` + reversed array.
  * Row 1 "New Arrivals" -> listProducts({ locale, sort:'new' })  (backend resolves to newest-by-id).
  * Row 2 -> listProducts({ locale, sort:'popular' }) AND relabel the heading to "Popular" /
    "Часто выбирают" / "Mashhur". This is real, rating-based (avg_rating).
  * DO NOT pass sort:'bestsellers' and DO NOT keep a "Bestsellers" label — the backend ProductScope
    does not implement a sales/order-based ranking; sort:'bestsellers' silently returns newest, which
    would be a false label. (Real bestsellers = a future backend phase aggregating orders.)
  * Keep the existing ProductCard and the 4-up grid. If a sort returns empty, render a graceful empty
    state — never fake items. If avg_rating is too sparse for a good "Popular" row in this env, fall
    back to sort:'new' for both rows with distinct honest copy (see spec appendix env-checks).
- Popular brands: KEEP the curated inline-SVG wordmarks. Backend-verified: labor_brands has no
  logo_url column, so the API always returns logo_url:null. Do NOT switch to live brand logos.
- Popular notes / Hero: KEEP curated. getNotes is alphabetical (not usage) with only 6 note images;
  the hero has no campaigns client in apps/web. Do not make these dynamic in this phase.
- FinderBand: KEEP as a CTA to /[locale]/find-your-perfume (that page already scores real catalog
  data). Just verify it renders real results at all three locales.
- MoodBrowser, Trust, Telegram, Custom: leave as classified (real images / editorial CTA / blocked).
  Do not convert Custom or Trust to "live".
- Allowed polish only: spacing/responsive fixes found in real-browser QA, safer empty/loading states,
  accessibility (alt text, aria-labels, focus, contrast). Reuse existing components and tokens. No
  global style rewrites, no new deps, no backend/checkout/bot/Spree-API changes, no fabricated data,
  no changes to header/footer/cart/auth shell. (Heading copy may move into the page's local COPY
  object; do not edit src/i18n/messages/*.json.)
- Money only via formatUzs(price, locale). All internal links locale-prefixed; product links to
  /[locale]/product/[slug].

STEP 3 — Visual QA + screenshots (real browser):
- Test /ru, /uz, /en at 1440px, 768px, 390px. Verify: real product images render (no broken
  Spree URLs), card alignment, grid spacing, NO horizontal scroll, header sticky, cart link,
  language switching, dark-section contrast, all CTA/Telegram/catalog/`/delivery` links, and
  NO console/hydration errors.
- Save screenshots to labor-redesign/production-phase2/screenshots/ as {locale}-{viewport}.png
  (minimum 9: 3 locales × 3 viewports), plus close-ups of any bug fixed.

STEP 4 — Verification (use the repo's actual scripts):
- npm --workspace @labor/web run typecheck   (tsc --noEmit)
- npm --workspace @labor/web run lint         (next lint)
- npm --workspace @labor/web run build        (next build)
  (or the turbo equivalents: npm run typecheck|lint|build)
- All three must pass. Fix anything you introduced.

STEP 5 — Commit (intentional files only; never `git add -A`):
- Stage only the homepage/component files you intentionally changed and the new screenshots dir.
- Do NOT stage: .claude/, cache/, docs/superpowers/, labor-redesign prototype files unrelated to
  this phase, temp typecheck files, or package/lockfiles (unless a dep genuinely changed — explain).
- Before committing: show `git status --short`, `git diff --staged --stat`, and the typecheck result.
- Commit message: feat(web): wire homepage product sections to real catalog data
- Body: list which sections became live, which stayed static and why, and the build/lint/typecheck
  results.

RETURN:
- files changed
- which sections now use real catalog data
- screenshots path
- bugs found and fixed
- build / lint / typecheck results
- remaining static sections and why
- risks before deployment
```

---

### Reviewer notes (for the human, not for the prompt)
- Expected change is now narrow and concentrated in `apps/web/src/app/[locale]/(site)/page.tsx`: the two product-grid fetches (`sort:'new'` + `sort:'popular'`), removing the `brand:'le-labo'` lock, and relabeling row 2 to "Popular" via the page's local COPY object.
- Decided to stay untouched/curated (backend-investigated): popular brands (no `logo_url` column), popular notes (alphabetical API, only 6 images), hero (no campaigns client). Plus header/footer/layout, `ProductCard`, fonts, tailwind/globals, i18n message files, all backend.
- Watch for the "Bestsellers" trap: `sort:'bestsellers'` is unimplemented and returns newest — the agent must use `sort:'popular'` + honest label, not resurrect a bestsellers query.
- If the agent proposes anything beyond the spec's §7 "allowed" list (live brands, dynamic notes, campaigns-driven hero, a homepage mini-finder), stop and re-scope — that's a later phase.
