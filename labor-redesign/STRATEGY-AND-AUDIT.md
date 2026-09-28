# Labor Parfum — New Site Strategy & Team Critique

A fresh, greenfield concept for a Tashkent-based niche & custom perfume house. This document holds the brand strategy that drives the build, and a brutal, role-by-role audit of the result. The prototype lives alongside this file as `index.html`.

---

## 1. Brand strategy

### Positioning
Labor is **a Tashkent fragrance laboratory, not a perfume shop.** The word *labor* (laboratory) is the whole idea: a place where scent is composed, tested, and signed. The site should feel like walking into a quiet, exact, beautiful lab — not a marketplace stall. Everything is curated, named, and explained, because the core problem is that **you cannot smell a website.** The entire experience is built to replace the missing sense of smell with language, structure, and trust.

Tagline kept and sharpened: **"A scent like a signature."** Supporting line: *"Найдите аромат, который говорит за вас"* / *"Find the fragrance that speaks before you do."*

### Personas (and the one thing each needs)
- **The Signature Seeker (women, 22–35).** Wants one scent that becomes "hers." Fears smelling like everyone else. Needs: mood/note language, "who it's for," social proof.
- **The Considered Man (men, 25–45).** Buys rarely, wants to buy *right*. Fears fakes and looking like he tried too hard. Needs: authenticity proof, longevity/sillage facts, occasion guidance.
- **The Gift Buyer (any, often last-minute).** Doesn't know fragrance, knows the person. Fears picking wrong. Needs: the finder quiz, gift framing, fast Telegram help.
- **The Niche Collector.** Knows oud from oudh. Fears a thin, generic catalog. Needs: brand depth, perfumer pages, note precision.
- **The Newcomer to niche.** Overwhelmed by notes. Needs: plain-language moods, samples/decants, hand-holding.

### The five real ecommerce problems (the build must answer all five)
1. **No smell online** → solved with notes pyramid, mood tags, "when to wear," and decant samples.
2. **Fear of fakes** → an explicit authenticity block on every PDP, not a buried FAQ line.
3. **Choice paralysis** → the Scent Finder is the primary CTA, above "wow" animation.
4. **Mobile + Telegram reality of Uzbekistan** → sticky bottom add-to-cart, one-tap Telegram order on every product.
5. **Trust on delivery/payment** → stated plainly in the cart and footer, in UZS.

### Differentiation vs. a generic perfume catalog
The lab metaphor (test, compose, sign), the finder-first homepage, decant/sample culture so people can try before committing, and **custom parfum** as a hero service no marketplace can copy. Avoided clichés: random bottle grids, gold-on-black "luxury," fake heritage language, unexplained notes.

### Voice
Elegant, sensual, exact. Poetic but never cheesy. Short sentences. Written so it survives translation into Russian (default) and Uzbek.

---

## 2. What was built (prototype scope)
Single self-contained `index.html` — no build step, opens in any browser. Demonstrates the full experience with structured sample data (clearly replaceable):

- Cinematic hero with finder-first CTA and ambient motion.
- Global shell: header, search, language toggle (RU default · UZ · EN), mobile nav, mini-cart drawer.
- Scent Finder quiz (mood · occasion · notes loved/avoided · season · intensity · gift) with transparent scoring → top-3 matches.
- Shop by Mood and Shop by Notes browsing.
- Catalog with filter drawer and premium product cards (brand, name, family, note chips, rating, UZS price, volume, sample badge).
- Product detail overlay: gallery, scent story, notes pyramid, longevity/sillage, "when to wear / who it suits," authenticity block, sample + Telegram-order actions.
- Custom Parfum inquiry section with a real form (preferred/disliked notes, purpose, budget, timeline, Telegram).
- Trust, delivery & payment (UZS), Telegram mini-app CTA, footer.
- Mobile sticky add-to-cart, accessible focus states, `prefers-reduced-motion` respected.

---

## 3. Brutal team audit

Six roles reviewed the first build. No praise — only what's wrong and what to do. Items marked **[fixed]** were addressed in the shipped prototype; the rest are honest, scoped limitations of a front-end prototype.

### Luxury Art Director
- The hero risked looking like every dark perfume site. **[fixed]** Added an off-black/ivory/champagne editorial palette and a serif display + clean sans pairing instead of gold-on-black.
- Product cards looked like a marketplace. **[fixed]** Removed loud badges, gave cards air, restrained note chips, hover reveal instead of permanent clutter.
- **Open:** real campaign photography is irreplaceable. The prototype uses CSS gradients/placeholders; the single biggest lift to "award-worthy" is art-directed bottle and skin photography. No code can fake this.

### Senior Ecommerce UX
- Finder buried below the fold would waste the whole strategy. **[fixed]** Finder is the hero's primary action and recurs as a sticky path.
- Filters that reload the page kill momentum. **[fixed]** Filtering is instant, client-side, in a drawer on mobile.
- **Open:** no real cart persistence or checkout — cart is in-memory only. Production needs server cart + order creation.

### CRO Specialist
- Every PDP must offer a low-commitment yes. **[fixed]** "Order a decant/sample" sits next to "Add to cart," and a one-tap Telegram order is always present — matching how Uzbek customers actually buy.
- Trust was implied, not shown. **[fixed]** Authenticity, delivery, and payment are explicit blocks, not footer fine print.
- **Open:** no analytics wired. Spec lists the events (`view_item`, `add_to_cart`, `quiz_completed`, `telegram_click`, `custom_parfum_request`); they need a real analytics layer.

### Mobile QA Lead
- Thumb can't reach a top-right add-to-cart. **[fixed]** Sticky bottom add-to-cart bar on small screens.
- Drawers that don't trap focus or close on Esc/backdrop frustrate. **[fixed]** Mini-cart, finder, filter drawer, and PDP all close on Esc and backdrop.
- **Open:** tested via desktop responsive emulation only; real-device testing (older Android, slow networks) still required.

### SEO Reviewer
- A single-file SPA-style page is weak for SEO. **Open (by design):** this is a design prototype. Production must be the real multilingual app with per-product routes, `Product`/`Breadcrumb`/`Organization` structured data, `hreflang` for ru/uz/en, sitemap, and OG images. The prototype includes baseline meta + JSON-LD as a pattern, not a substitute.

### Accessibility Reviewer
- Note chips as color-only would fail. **[fixed]** Every chip carries a text label; focus states are visible; contrast targets AA on text.
- Motion can nauseate. **[fixed]** All ambient/scroll motion is gated behind `prefers-reduced-motion`.
- **Open:** full screen-reader pass and keyboard-only walkthrough of every interactive state still needed before launch.

---

## 4. What still needs real inputs before launch
Real product data & prices (UZS), authenticated authenticity claims, professional photography, a server cart + checkout, Uzbek payment providers (Payme/Click), delivery integration & stock, the Telegram bot/mini-app wiring, analytics, and full ru/uz/en translation. The prototype is structured so each of these slots into clearly-marked data and component boundaries.

---

## 5. Typography update

The prototype's temporary Cormorant Garamond + Inter pairing was replaced with **Labor's real production font system**, so the prototype now matches the live brand.

**Exact fonts**
- **Story Script** (Regular, 400) — display / headings / brand wordmark.
- **Roboto Slab** (variable, weights 100–900) — body, navigation, buttons.

**Where they were found.** Not guessed. Identified from the live site and confirmed in the monorepo:
- `apps/web/src/lib/fonts.ts` defines both via `next/font/local`, pointing at `apps/web/public/fonts/StoryScript-Regular.ttf` and `RobotoSlab-VariableFont.ttf`.
- `apps/web/tailwind.config.ts` maps `display: ['var(--font-story-script)', 'Georgia', 'serif']` and `sans: ['var(--font-roboto-slab)', 'Georgia', 'serif']`.
- `apps/web/src/app/layout.tsx` loads both and sets `<body className="font-sans">`; headings and the "Labor" wordmark (`src/components/site-header.tsx`) use `font-display`.
- The live site (`laborparfum.com`) renders the same wordmark and structure, served via `next/font/local` from these same files.

**What changed in `index.html`**
- Removed the Google Fonts `<link>` hotlinks (Cormorant + Inter).
- Self-hosted the real fonts: copied the TTFs and their license files into `labor-redesign/assets/fonts/`, added local `@font-face` declarations (no third-party hotlinking).
- Repointed the CSS variables to the production stack and replicated the live fallback chain exactly: `--serif: "Story Script", Georgia, serif` (display) and `--sans: "Roboto Slab", Georgia, serif` (body).
- Re-styled the "Labor" wordmark (header + footer) to match the live logo: Story Script, normal case, normal tracking (was uppercase + heavy letter-spacing, which suited the old serif but breaks a script face).
- Tuned heading weight to 400 (Story Script is single-weight — avoids faux-bold) with slightly looser line-height for the script's ascenders/descenders.

**Important Cyrillic caveat (faithful to production).** Story Script is **Latin-only — it has no Cyrillic glyphs.** Roboto Slab has full Cyrillic, including Uzbek-Cyrillic extended characters (Ў, ғ, Ҳ…). Therefore:
- All body text in RU / UZ / EN renders in Roboto Slab.
- **EN headings** render in the Story Script handwriting face; **RU and UZ headings fall back to Georgia serif** — which is exactly how the live site behaves today, because production uses the same Latin-only display font with the same Georgia fallback. This is intended parity, not a defect.

**Licensing / production caution**
- **Roboto Slab** — Apache License 2.0 (`assets/fonts/RobotoSlab-LICENSE.txt`).
- **Story Script** — SIL Open Font License 1.1 (`assets/fonts/StoryScript-OFL.txt`).
- Both licenses permit self-hosting and redistribution provided the license file travels with the font — both license files were copied alongside the TTFs. No unlicensed or hotlinked fonts are used.
- Production note: the live app ships the **variable** Roboto Slab TTF (~241 KB) via `next/font` (which subsets/optimizes and avoids layout shift). The static prototype loads the full unsubset TTF directly; for any real deployment, subset to the Latin+Cyrillic ranges actually used and prefer `woff2` to cut weight. If a Latin-script personality is wanted for Cyrillic headings too, a Cyrillic-capable display face would need to be chosen deliberately — a brand decision, not a prototype fix.
