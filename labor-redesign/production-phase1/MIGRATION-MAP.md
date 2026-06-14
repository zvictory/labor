# Prototype → Production migration map

Moving the `labor-redesign/index.html` prototype into the real `apps/web` storefront, using existing Labor stack and conventions. No backend changes, no architecture changes, no checkout/payment/bot work.

## Audit findings (apps/web)

- **Homepage route:** `apps/web/src/app/[locale]/(site)/page.tsx` (RSC, `generateStaticParams` over `locales`).
- **Layout/shell (reuse, untouched):** `(site)/layout.tsx` wraps every page with `SiteHeader`, `SiteFooter`, `CompareDrawer`, analytics. The homepage returns sections only — it does **not** render its own header/footer.
- **Header/footer:** `src/components/site-header.tsx`, `src/components/site-footer.tsx` — already use `font-display` wordmark, `LocaleSwitcher`, cart/search/wishlist/account links. Cart is a **page** (`/cart`), not a drawer.
- **Product card (reuse):** `src/components/catalog/product-card.tsx` — takes `{ product, locale }`, formats price via `lib/format.formatUzs` (UZS integer, locale-aware grouping).
- **Hero (reuse):** `src/components/home/hero-slider.tsx` — client slider over `/slides/*.png`, one CTA per slide.
- **Data (reuse):** `lib/api/products.listProducts({ locale, brand, note, family, gender, sort })` → `/api/v2/storefront/products`. Homepage currently fetches `brand: 'le-labo'`.
- **Design tokens (reuse):** Tailwind `bone`, `ink`/`ink-muted`, `brass` (+50–900), semantic `border`/`background`, `container`, `font-display`/`font-sans`. No `components/ui/` (no shadcn dir).
- **i18n:** next-intl (`home`, `nav`, `brand` namespaces) for shared strings; **component-local per-locale `COPY` objects** for section copy (existing convention in `page.tsx`). Locales: ru (default), en, uz.
- **Real routes available for links:** `/catalog?note=…&brand=…&sort=…`, `/notes`, `/brands`, `/perfumers`, `/find-your-perfume`, `/delivery`, `/campaigns`, Telegram `t.me/labor_uz_bot`.

## Section-by-section map

| Prototype section | Decision | Backend? | How in Phase 1 |
|---|---|---|---|
| Hero (cinematic, finder-first) | **Reuse existing** `HeroSlider` (live campaign slides) | live | Keep as-is. |
| Scent Finder CTA | **New static** component `FinderBand` | none (links to live `/find-your-perfume`) | Additive band under hero — injects the "finder leads" idea without touching `HeroSlider`. |
| Product carousel/grid (New / Bestsellers) | **Reuse** `ProductCard` + `listProducts` | live | Keep both rows. |
| Note browsing | **Already exists** in `page.tsx` (popular notes, live `/catalog?note=`) | live | Keep. |
| Brand browsing | **Already exists** in `page.tsx` (popular brands) | live | Keep. |
| Mood browsing | **New static** `MoodBrowser` | none (maps moods → real note slugs) | 4 gradient tiles → `/catalog?note=musk|rose|bergamot|sandalwood`. No images/assets needed. |
| Custom parfum | **New static marketing** `CustomParfumCta` | **blocked** (no custom route/model yet) | CTA → Telegram. Clearly a placeholder until a backend flow exists. |
| Trust / authenticity | **New static** `TrustStrip` | none | 4 cards; delivery card → live `/delivery`. |
| Telegram CTA | **New static** `TelegramCta` | none (live `t.me/labor_uz_bot`) | Reuses the bot link already in the footer. |
| Footer | **Reuse existing** `SiteFooter` | live | Untouched. |

## Reuse vs create

- **Reused (unchanged):** `layout.tsx`, `SiteHeader`, `SiteFooter`, `CompareDrawer`, `HeroSlider`, `ProductCard`, `listProducts`, `format.ts`, Tailwind tokens, next-font, i18n, routing.
- **Newly created (all static, server components, in `src/components/home/`):** `finder-band.tsx`, `mood-browser.tsx`, `custom-parfum-cta.tsx`, `trust-strip.tsx`, `telegram-cta.tsx`.
- **Modified:** only `page.tsx` (compose the new + existing sections).

## Safety / reversibility

- Original `page.tsx` saved to `labor-redesign/production-phase1/page.original.tsx`. One-file rollback: `git checkout -- apps/web/src/app/[locale]/(site)/page.tsx` (or restore from the backup).
- No edits to `globals.css`, `tailwind.config.ts`, i18n message files, layout, header, footer, or any backend file.
- No new dependencies; only `next/link`, `next/image`, and already-installed `lucide-react`.
- No external font/image hotlinks — mood/trust/custom sections use Tailwind gradients + lucide icons only.

## Deferred to Phase 2+ (out of scope now)

Live custom-parfum inquiry (needs backend model/route + Telegram handoff), mood as a real catalog facet, scent-finder result wiring beyond the existing finder page, cart drawer/mini-cart, checkout, payment, Telegram bot changes, analytics events for the new CTAs.
