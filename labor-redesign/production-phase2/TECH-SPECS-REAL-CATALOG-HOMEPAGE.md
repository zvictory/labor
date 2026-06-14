# Phase 2 — Real-catalog homepage: Technical Specification

Owner doc for the next chunk of work on the Labor Parfum storefront. This is a **specification, not an implementation**. Implementation happens via Claude Code on the real dev machine (the sandbox used for Phase 1 cannot run the app — see §6).

Prereq commits already on `main`:
- `0d32040` — integrated redesigned homepage shell (Phase 1).
- `b098c55` — mood tiles now use real note imagery.

---

## 1. Goal

Make the redesigned homepage render **real Labor catalog data and real product imagery** wherever the data already exists, replacing placeholder/static catalog assumptions — **without** changing the production architecture, backend, or the existing header/footer/cart/auth shell.

"Wherever the data already exists" is the key constraint: this phase wires up data that is **already served** by the existing storefront API. It does **not** add backend models, fields, or endpoints. Sections that genuinely have no backing data stay as marketing copy and are documented as such.

---

## 2. Existing architecture to respect

Verified against the repo (not assumed). Note one correction to older notes: the web app is on **Next.js 15.5** (App Router), not 14 — `apps/web/node_modules/next` reports `15.5.18`. Treat App Router + RSC conventions accordingly.

| Concern | Reality in repo |
|---|---|
| Web framework | Next.js **15.5** App Router, RSC, in `apps/web`. `generateStaticParams` over `locales` on the homepage. |
| Backend | Spree 5.4 (Rails), `apps/backend`. Not touched in Phase 2. |
| Storefront API prefix | `/api/v2/storefront/...` (kept stable; V2→V3 shim in backend). |
| API client | `apps/web/src/lib/api/{client,products,notes,brands,facets,...}.ts`. `apiFetch` resolves `INTERNAL_API_URL` (SSR) / `NEXT_PUBLIC_API_URL` (browser). Responses validated with `@labor/api-client` Zod schemas. |
| `listProducts` | `listProducts({ locale, page?, brand?, note?, family?, gender?, q?, sort? })` → `productListResponseSchema`. Filters map to `filter[brand|note|family|gender|name]` and `sort`. |
| `ProductCard` component | `src/components/catalog/product-card.tsx` — takes `{ product, locale }`, renders real Spree `product.image`, brand, name, `formatUzs(price)`, rating (`avg_rating`/`votes_count`), and `top_accord` chip. Links to `/${locale}/product/${slug}`. |
| Product image handling | `ProductCard` uses `next/image` with `product.image` (real Spree media URL) and a brand-name fallback box when `image` is empty. `next.config.mjs` `images.remotePatterns` already allows `labor.uz`, `laborparfum.com`, `backend`, `localhost`, `fimgs.net`, `fragrantica.com`, `t.me`, `*.telegram.org`. |
| Catalog routes & filters | `/${locale}/catalog?note=&brand=&family=&gender=&sort=` and `/${locale}/shop`. PDP at `/${locale}/product/[slug]`. Notes `/notes`, brands `/brands`, perfumers `/perfumers`, finder `/find-your-perfume`, `/delivery`. |
| `ProductCard` schema (`packages/api-client/src/catalog/product.ts`) | `slug, name, brand, price:number, image:string, avg_rating:number, votes_count:number, top_accord?{name,color_hex}`. So rating/votes are **real fields** — not invented. |
| Notes API | `src/lib/api/notes.ts` → `getNotes(locale)` returns `NoteSummary[] { slug, name, family?, color_hex?, icon_url?, product_count }`; `getNote(slug, locale)` returns detail incl. `products`. |
| Brands API | `src/lib/api/brands.ts` → `getBrands(locale)` returns `BrandSummary[] { slug, name, country?, origin?, logo_url?:string\|null, niche?, description?, story?, product_count }`; `getBrand(slug, locale)` incl. `products`. |
| i18n | next-intl. Locales **ru (default), en, uz** (`uzc` removed — do not add). Shared strings in `src/i18n/messages/{ru,en,uz}.json`; section copy is **component-local per-locale `COPY` objects** by convention. |
| Fonts | `next/font/local`: **Roboto Slab** (`--font-roboto-slab`, body/`font-sans`) + **Story Script** (`--font-story-script`, display/`font-display`). Tailwind fallback chain `… , Georgia, serif`. Story Script is Latin-only → RU/UZ headings fall back to Georgia (by design). |
| Shell | `(site)/layout.tsx` wraps pages with `SiteHeader`, `SiteFooter`, `CompareDrawer`, analytics. Cart is a **page** (`/cart`), not a drawer. Do not replace. |
| Money | UZS integer minor units; render only via `lib/format.formatUzs(amount, locale)`. Never `Intl.NumberFormat` directly (hydration-safe hand-rolled grouping). |
| Telegram | Order/notify patterns live in backend + bot; homepage only links to `https://t.me/labor_uz_bot`. No bot changes in Phase 2. |
| Design tokens | Tailwind `bone`, `ink`/`ink-muted`, `brass`(+50–900), semantic `border`/`background`. `container` for width. No `components/ui/` (no shadcn dir). |

---

## 3. Current homepage data audit

Classification legend: **LIVE** (already live-data) · **STATIC-OK** (static, acceptable) · **MAKE-LIVE** (static, should become live) · **CTA** (CTA-only by design) · **BLOCKED** (needs backend/API not yet present).

| Section | Current data source | Real images? | Locale-aware? | Phase 2 change | Risk |
|---|---|---|---|---|---|
| **HeroSlider** | Local `/slides/hero.png`, `/slides/woody.png` + i18n/COPY text | Yes (curated marketing slides) | Yes | **STATIC-OK (keep curated) — DECIDED.** Backend-verified: a `campaigns` API + `campaign_slide` models exist, **but `apps/web` has no campaigns API client and the homepage never calls it** — HeroSlider is hardcoded local slides. Wiring campaigns needs a new web API client + image handling = separate phase. Keep static in Phase 2. | Low |
| **FinderBand** | Static copy; links to `/find-your-perfume` | n/a (no imagery) | Yes (ru/en/uz COPY) | **CTA** — keep. The linked finder page already scores real catalog data (see §5). | Low |
| **MoodBrowser** | Static mood→note-slug map; **real** `/notes/*.png` images (post `b098c55`); links to `/catalog?note=` | Yes (real note images) | Yes | **STATIC-OK** — already uses real images + real catalog filters. Optional: pull labels/counts from `getNotes`, but mood grouping is curated, keep static. | Low |
| **New Arrivals + "Bestsellers" grids** | `listProducts({ brand:'le-labo' })`; **real** `ProductCard` | Yes (real Spree media) | Yes | **MAKE-LIVE (refine)** — already live but both rows query only `brand:'le-labo'` and "bestsellers" is just the reversed array. **Decision (backend-verified):** row 1 → `sort:'new'`; row 2 → `sort:'popular'` (real, rating-based) **relabeled "Popular", NOT "Bestsellers"**. `sort:'bestsellers'` is **not implemented** (see §4.3) — do not use it. Remove the `brand:'le-labo'` lock. | Medium |
| **Popular notes** | Hardcoded 6 note slugs + `/notes/*.png` + per-locale names; links `/catalog?note=` | Yes | Yes | **STATIC-OK (keep curated) — DECIDED.** Storefront `getNotes` returns notes ordered **alphabetically by name**, not by usage, and only 6 curated note images exist in `public/notes`. Dynamic ordering would surface notes with no image. Keep the curated 6. | Low |
| **Popular brands** | Hardcoded 8 brands + **inline SVG wordmarks**; links `/catalog?brand=` | Logos are inline SVG, not brand media | Partly (descriptors static) | **STATIC-OK (keep curated) — DECIDED.** Backend-verified: `labor_brands` has **no `logo_url` column** (and no `origin`); the serializer's `brand.try(:logo_url)` always returns `null`. Switching to live brand logos would render empty/broken logos. Keep the curated inline-SVG wordmark set. | Low |
| **CustomParfumCTA** | Static marketing; CTA → Telegram | Gradient only | Yes | **BLOCKED/CTA** — no custom-parfum model/route exists. Keep as marketing CTA. Becomes live only after a backend inquiry flow (later phase). | Low |
| **TrustStrip** | Static copy; delivery card → `/delivery` | Icons only | Yes | **STATIC-OK** — trust messaging is editorial, not catalog data. | Low |
| **TelegramCTA** | Static; link → `t.me/labor_uz_bot` | n/a | Yes | **CTA** — keep. | Low |
| **Footer / Header / Cart shell** | `SiteHeader`/`SiteFooter`, `LocaleSwitcher`, cart page | n/a | Yes | **STATIC-OK / do not touch** — reuse as-is. | Low |

**Net Phase 2 work surface (narrowed after backend investigation):** essentially **just the two product grids** — point them at real `sort` feeds and drop the `brand:'le-labo'` lock. Popular brands, popular notes, and the hero are now **DECIDED to stay curated** (backend lacks brand logos, notes aren't usage-ordered with images, hero isn't wired to campaigns). Everything else is LIVE, CTA, or BLOCKED. This makes Phase 2 a small, low-risk change concentrated in `page.tsx`.

---

## 4. Real catalog integration requirements

1. **Product cards:** use the existing `ProductCard` component and `listProducts` only. Do not build a parallel card or re-fetch shape.
2. **Imagery:** product images must come from `product.image` (Spree media). Keep the existing empty-image fallback in `ProductCard`. Do not add placeholder bottles or stock art for products.
3. **Product grids (the core change):** replace the `brand:'le-labo'` + reversed-array approach.
   - **Backend-verified sort support** (`Labor::Catalog::ProductScope`): only `popular` (orders by real `avg_rating DESC NULLS LAST`), `price_asc`, `price_desc`, and the default/else branch (`order(id: :desc)` = newest). **`sort` values `new` and `bestsellers` are NOT special-cased — they silently fall through to newest-by-id.** So `sort:'bestsellers'` returns newest products under a false label.
   - **Do:** row 1 "New Arrivals" → `listProducts({ locale, sort:'new' })` (resolves to newest, honest). Row 2 → `listProducts({ locale, sort:'popular' })` and **relabel the heading "Popular" / "Часто выбирают" / "Mashhur"** (real rating-based signal). **Do NOT** label it "Bestsellers" and **do NOT** pass `sort:'bestsellers'` — there is no sales/order-based ranking yet.
   - If a sort returns empty in the environment, render a graceful empty state (see §7), never fake items. Keep the 4-up grid / result cap (backend default `per_page` 24; the homepage slices to its grid).
4. **Notes:** keep the curated 6 slugs + existing `/notes/*.png`. Storefront `getNotes` returns **alphabetical** order (not usage), and `color_hex`/`product_count` are real but there are only 6 note images — so do not go dynamic. If ever dynamic, use `name`/`color_hex` from the API; never invent.
5. **Brands:** **keep the curated inline-SVG wordmark block.** `labor_brands` has **no `logo_url`/`origin` columns** → the API always returns `logo_url: null`. Real fields that DO exist (`country`, `founded_year`, `niche`, `product_count`) are not enough to render the bespoke wordmarks. Do not switch to live brand data in Phase 2.
6. **Prices:** only `formatUzs(price, locale)`. UZS integer minor units. No new currency, no client `Intl.NumberFormat`.
7. **Links:** every internal link stays locale-prefixed `/${locale}/...`. Product links go to the real PDP `/${locale}/product/${slug}`. Catalog filter links keep `?note=|brand=|family=|sort=`.
8. **No fabricated data:** no fake ratings, inventory, "bestseller" badges, or authenticity claims unless backed by real fields. `avg_rating`/`votes_count` are real and may be shown; the card already hides rating when `votes_count === 0`.
9. **Hardcoded data:** allowed only for genuinely editorial marketing copy (FinderBand/Custom/Trust/Telegram text, curated mood groupings) and must stay clearly commented as such.

---

## 5. Scent Finder data strategy

**Finding (verified):** the `/find-your-perfume` page **already fetches real products via `listProducts` and scores them against real catalog data.** `PerfumeFinderClient.scoreProduct` uses real `product.avg_rating`, `product.price`, product families/accords, and gender filters; it includes a real empty state ("The finder needs catalog data"). So no metadata needs to be invented for a finder.

- **Option A — CTA-only (RECOMMENDED for now).** Keep `FinderBand` as a homepage CTA linking to `/${locale}/find-your-perfume`. The destination is already real-data powered, so this delivers a real finder experience with zero new metadata work and minimal risk. Phase 2 action: just verify the finder page still loads and scores against live data at all three locales.
- **Option B — homepage mini-finder (defer).** Embedding a few finder steps on the homepage would require duplicating/scoring logic and a mood/occasion/intensity→note/family mapping. The catalog already exposes `family`, `gender`, and accords, but mood/occasion/intensity are **not** first-class product fields — they'd be a curated mapping layer. This is extra surface area and risk for little gain while a full finder page already exists. Do **not** invent product metadata; if a mini-finder is later desired, first define any required admin/backend fields in a separate spec.

**Recommendation: Option A.** Keep the CTA; verify the existing finder page renders real results. Revisit Option B only after deployment data shows homepage finder demand.

---

## 6. Visual QA requirements (real dev machine)

The Phase 1 sandbox could **not** run `next dev`/`next build` (SWC/native **Bus error** under emulated aarch64), so no real browser QA was possible there. Phase 2 must be done where the app actually runs.

Test routes **`/ru`, `/uz`, `/en`** at viewports **1440px (desktop)**, **768px (tablet)**, **390px (mobile)**. Verify:

- Real product images render (no broken Spree image URLs / 404s); check the Network tab.
- Product card alignment and product-grid spacing are consistent across the 4-up grid.
- No horizontal scroll at any viewport (check `document.documentElement.scrollWidth <= clientWidth`).
- Header sticky behavior and no overlap with the hero/finder band.
- Cart entry point works (header bag → `/cart`).
- Language switching works and updates all section copy (RU/UZ/EN).
- Dark-section contrast (FinderBand, CustomParfumCTA, TelegramCTA) is legible.
- CTA links, Telegram links (`t.me/labor_uz_bot`), catalog filter links (mood/notes/brands), and `/delivery` all resolve to locale-correct destinations.
- Console shows no runtime or **hydration** errors.

**Screenshots:** save to `labor-redesign/production-phase2/screenshots/` — name as `{locale}-{viewport}.png` (e.g. `ru-390.png`), 9 total minimum (3 locales × 3 viewports), plus close-ups of any bug found/fixed.

---

## 7. Implementation boundaries

**Allowed:** replace static product assumptions with real `listProducts`/`ProductCard` data; reuse existing components; add small server components or thin data adapters if needed; fix spacing/visual bugs found in real-browser QA; add safer empty/loading states for product grids (skeleton or a quiet "catalog unavailable" message — never fake items); accessibility polish (alt text, aria-labels, focus, contrast).

**Not allowed:** new backend models/fields/endpoints; checkout/payment changes; Telegram bot changes; Spree API changes (unless explicitly scoped for a later phase); fabricated product data; new dependencies unless absolutely necessary; global style rewrites (`globals.css`/`tailwind.config.ts`); replacing or restructuring header/footer/cart/auth shell or the i18n message files.

---

## 8. Verification commands (real dev machine)

Use the repo's actual scripts. Run web-only unless backend data is needed; for live catalog data the backend API must be reachable (`npm run dev:all` brings up Docker infra + web + bot per `CLAUDE.md`).

```bash
# 0. Native deps for the current platform (only if a native Bus error / missing
#    binary appears). Reinstall so platform-correct binaries are fetched:
npm install            # from repo root (workspaces); fixes @parcel/watcher + @next/swc for this OS

# 1. Run the full stack (Docker infra + web:3001 + bot:8080), per CLAUDE.md:
npm run dev:all
#    — or web only (product grids need the backend API reachable for live data):
npm --workspace @labor/web run dev      # next dev -p 3001

# 2. Typecheck (web):
npm --workspace @labor/web run typecheck   # tsc --noEmit
#    — or all workspaces:
npm run typecheck                          # turbo run typecheck

# 3. Lint (web):
npm --workspace @labor/web run lint        # next lint
#    — or all:
npm run lint                               # turbo run lint

# 4. Build (web):
npm --workspace @labor/web run build       # next build
#    — or all:
npm run build                              # turbo run build

# 5. Browser QA / screenshots: open http://localhost:3001/ru (and /uz, /en) and
#    capture 1440 / 768 / 390 via browser devtools or a Playwright script run
#    against the dev server, saving into labor-redesign/production-phase2/screenshots/.
```

Notes: package manager is **npm workspaces** (never bun/yarn/pnpm). Admin/backend reset commands are in `CLAUDE.md` if seeded data is needed. Do not commit lockfile changes from step 0 unless a dependency genuinely changed.

---

## 9. Deliverables for Phase 2

Claude Code returns:
- Files changed (intentional only).
- Which homepage sections now use real catalog data (and which stayed static, with why).
- Screenshots path (`labor-redesign/production-phase2/screenshots/`) with the 3×3 matrix.
- Bugs found and fixed during real-browser QA.
- `typecheck` / `lint` / `build` results (real, from the dev machine).
- Remaining static sections and the reason each stays static (Custom = no backend, Trust/Telegram = editorial, Hero = curated).
- Risks before deployment: product-image coverage / `PUBLIC_HOST` + `remotePatterns` correctness (broken Spree blob URLs), sparse `avg_rating` weakening the "Popular" row, and the default feed breadth once the `brand:'le-labo'` lock is removed. (Brand-logo and campaigns risks are avoided by keeping those sections curated.)

---

## Appendix — decisions (resolved from the codebase)

These were open questions; the backend/frontend now answer them definitively.

1. **Product feed signals — RESOLVED.** `ProductScope` implements `popular` (real `avg_rating`), `price_asc`, `price_desc`; everything else (incl. `new`, `bestsellers`) → newest-by-id. **Decision:** New Arrivals = `sort:'new'` (newest), second row = `sort:'popular'` **relabeled "Popular"**. `sort:'bestsellers'` is forbidden until real order-aggregation exists (future phase: aggregate `Spree::Order`/line items, not in scope).
2. **Brand logos — RESOLVED.** No `logo_url` column on `labor_brands`; API returns `null`. **Decision:** keep curated inline-SVG wordmarks. Live brand data is deferred until brand logo assets/columns exist.
3. **Notes/brands ordering — RESOLVED.** Keep the curated 6 notes and 8 brands. `getNotes` is alphabetical (not usage), and only 6 note images exist; brand logos are null. Dynamic ordering buys nothing now.
4. **HeroSlider — RESOLVED.** Campaigns API exists backend-side but `apps/web` has no campaigns client and the hero is hardcoded local slides. **Decision:** keep curated static hero; wiring campaigns is a separate phase (needs a new web API client + campaign image handling).

### Remaining environment-dependent checks (must be confirmed on the dev machine, not code-answerable)

- **Product image coverage:** `ProductCardSerializer.first_image_url` returns a `rails_blob_url` built from `PUBLIC_HOST` (default `http://localhost:4000`) only when a master image is attached, else `''`. Confirm seeded products actually have attached images in the target env and that `PUBLIC_HOST`/CDN host is set so URLs resolve (and is allow-listed in `next.config.mjs images.remotePatterns`). The `ProductCard` empty-image fallback covers gaps, but verify real imagery renders.
- **`sort=popular` population:** confirm enough seeded products have non-null `avg_rating` so the "Popular" row isn't dominated by `NULLS LAST` filler. If ratings are sparse, fall back to `sort:'new'` for both rows with distinct copy (still honest).
- **`sort=new` breadth:** confirm the default feed returns a healthy multi-brand set once the `brand:'le-labo'` lock is removed (it should, since canonical products span ~100 brands per the seed).
