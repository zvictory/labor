# Design System Audit — Labor `apps/store`

Scope: the new storefront's tokens (`tailwind.config.ts`, `app/globals.css`) and all 35 components under `components/`. (The same components also live, drifted, in `apps/web` — see "Cross-app" below.)

## Summary
**Components reviewed:** 35 | **Issues found:** 7 (2 high, 3 medium, 2 low) | **Score: 62/100**

Strong, coherent **token foundation** (warm neutral + brass, dual brand/semantic layer, real fonts). The gap is the **missing primitive layer** — no shared `Button`/`Input`/`Badge`/`Dialog`, so button and badge styling is re-typed inline ~50 times, and a sub-scale of micro-typography (`text-[10px]`, `tracking-[0.3em]`) is hardcoded ~100 times instead of tokenized.

---

## Naming Consistency
| Issue | Components | Recommendation |
|-------|-----------|----------------|
| Files are consistently kebab-case, feature-foldered — good | all | Keep |
| Only one "badge" exists (`orders/status-badge`) while cart/PDP re-implement badges inline | `status-badge`, `product-card` (accord + sample tags), `cart/*` | Promote one `Badge` primitive with variants |
| "CTA" vs "button" used interchangeably for the same visual | `*-cta.tsx`, inline buttons | Standardize on a `Button` primitive; reserve "CTA" for marketing sections |

## Token Coverage
| Category | Defined | Hardcoded / arbitrary found |
|----------|---------|------------------------------|
| Colors | ~25 (bone, ink+muted, brass 50–900, 13 semantic HSL vars + dark mode) | **28 hex instances** in components; most duplicate existing tokens (`#1A1714`=ink, `#8B6F47`=brass, `#FAF8F4`=bone, `#6B6258`=ink-muted, `#9B2C2C`=destructive) |
| Telegram brand blue | **0** | `#229ED9` / `#1c7fb0` hardcoded **~13×** — no token |
| Typography (family) | 2 (Roboto Slab, Story Script via CSS vars) | OK |
| Typography (size/tracking scale) | 0 custom (Tailwind defaults only) | **~104 arbitrary** `text-[10px]/[11px]/[9px]/[8px]`, `tracking-[0.3em/0.25em/0.2em]` — a real, repeated micro-scale that isn't tokenized |
| Spacing | Tailwind default scale | Mostly fine; a few one-off `w-[720px]`, `h-[80vh]`, `h-[550px]` (hero) |
| Radius | 1 (`--radius` + lg/md/sm) | OK |
| **Shadow / elevation** | **0** | Ad-hoc `shadow-*` / none — no elevation system |
| **Motion** | **0** | `transition`/`duration-*` inline per component; no duration/easing tokens |
| **Total arbitrary-value instances** | — | **137** |

🐞 **Bug:** `m-[#1A1714]` appears in a component — a margin utility with a hex value is meaningless (typo, likely meant `bg-`/`text-`). Fix it.

## Component Completeness
| Component | States | Variants | Docs | Score |
|-----------|--------|----------|------|-------|
| `ProductCard` | ✅ hover, ✅ empty-image fallback, ⚠️ no loading | ⚠️ one variant only | ❌ | 7/10 |
| **Button** (primitive) | — | — | — | **0/10 — does not exist** (≈50 inline copies) |
| **Input** (primitive) | — | — | — | **0/10 — does not exist** (raw `<input>` everywhere) |
| **Badge** | ⚠️ | `status-badge` only | ❌ | 3/10 |
| `MiniCart` (drawer) | ✅ open/empty, ⚠️ loading | ⚠️ bespoke, not a reusable `Drawer` | ❌ | 5/10 |
| `AddToCart` | ✅ default, ⚠️ optimistic, ❌ error/disabled inconsistent | ⚠️ | ❌ | 6/10 |
| Home sections (`finder-band`, `mood-browser`, …) | ✅ | ✅ consistent token use | ❌ | 8/10 |
| Admin forms (`product-form`, `checkout-form`) | ⚠️ submit/error states vary | ⚠️ | ❌ | 5/10 |

## Cross-app drift (structural)
`apps/web` and `apps/store` carry **the same components** (ProductCard, home/*, header/footer) as independent copies. They will drift. Candidate for a shared `packages/ui` once the primitive layer exists.

---

## Priority Actions
1. **Add a primitive layer** (`components/ui/`): `Button` (variants: primary/ghost/gold/telegram; sizes sm/md; states default/hover/active/disabled/loading), `Input`/`Field`, `Badge`, `Drawer`, `Card`. Replace the ~50 inline button strings + bespoke drawer/badges. Biggest consistency + maintenance win.
2. **Tokenize what's already a de-facto scale:** add an `--color-telegram` token and a micro-type scale (e.g. `text-eyebrow` = 10px/0.3em, `text-overline` = 11px) so the ~117 arbitrary typography/Telegram values become named. Then lint-ban arbitrary `[...]` color/type values.
3. **Add elevation + motion tokens** (3 shadow levels; `--duration-fast/base`, standard easing) and replace ad-hoc `shadow-*`/`transition` usage. Fix the `m-[#1A1714]` bug. Add a token-lint (e.g. `eslint-plugin-tailwindcss` / a grep CI check) to stop new hardcoded hex.

---

### Suggested follow-ups
- `/design-system extend Button` — design the missing primitive (variants/states/tokens) before refactoring.
- `/design-system document ProductCard` — lock the one component every page depends on.
- Lift primitives into `packages/ui` to kill the apps/web ↔ apps/store duplication.
