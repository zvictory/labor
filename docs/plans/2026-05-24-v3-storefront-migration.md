# V3 Storefront API Migration Plan

Status: **Draft / Not yet scheduled**
Findings addressed: B-4 (V2 shim auth gap), A-12 (V3 migration debt)
Owner: backend team
Estimated effort: **1–2 sprints**, gated by Spree 5.5/6.0 release timing.

---

## 1. Problem

`apps/backend/app/controllers/spree/api/v2/base_controller.rb:9` re-introduces
the removed `Spree::Api::V2` constant by subclassing `V3::BaseController`
instead of `V3::Store::BaseController`. The choice is deliberate — the
publishable-key gate on `V3::Store::BaseController` would 401 every request
from `apps/web` and `apps/bot`, since neither client currently sends
`X-Spree-Token`.

Consequences:

1. **Auth gap.** Every Labor storefront endpoint (12 controllers under
   `spree/api/v2/storefront/`) inherits a controller with no platform-level
   auth. CORS + Rack::Attack are the only walls.
2. **Upgrade debt.** Spree 5.5 / 6.0 will almost certainly tighten the V3
   contract further or drop the `V2` namespace entirely. The shim is
   load-bearing — removing it breaks 12 controllers + 4 nested namespaces
   (delivery, payments, brands, campaigns, etc).
3. **Convention drift.** Half-routed under `/api/v2/storefront/...`, half
   under `/labor/storefront/...` (see `apps/backend/config/routes.rb:64-70`).
   No single migration target.

## 2. Goal

Run V2 and V3 storefront routes side-by-side for **one release** (≥ 1 month
in production), then deprecate V2 entirely. End state:

- All storefront endpoints under `/api/v3/storefront/...` parented by
  `V3::Store::BaseController`.
- `apps/web` and `apps/bot` send `X-Spree-Token: <publishable_key>` via
  `packages/api-client`.
- `/api/v2/storefront/...` routes return `Sunset` header during the
  transition, 410 Gone after deprecation date.
- Shim controller deleted.

## 3. Non-goals

- Multi-currency, multi-store routing.
- Replacing Mobility / catalog translation backend.
- Reworking `/labor/storefront/...` routes (those don't share the V3 base).
  They get a parallel `/api/v3/storefront/` mirror in step 5 only.

## 4. Inventory

Controllers to migrate (all under
`apps/backend/app/controllers/spree/api/v2/storefront/`):

| Controller | Public/Auth | Risk |
|---|---|---|
| `account_locale_controller` | user-token | low |
| `brands_controller` | public | low |
| `campaigns_controller` | public | low |
| `checkout_controller` | user-token | **high** — payment side-effects |
| `filter_facets_controller` | public | low |
| `notes_controller` | public | low |
| `perfumers_controller` | public | low |
| `search_controller` | public | low |
| `telegram_auth_controller` | public (login) | **high** — issues JWT |
| `delivery/*` | mixed | medium |
| `payments/click_controller` | provider webhook | **critical** — no key |
| `payments/payme_controller` | provider webhook | **critical** — no key |
| `payments/uzum_controller` | provider webhook | **critical** — no key |

**Payment provider webhooks must NOT require the publishable key.** They are
called by external systems (Click, Payme, Uzum) that have their own per-method
auth (HMAC, Basic, signed timestamps). Those stay on a non-keyed base class
even after migration — see step 5.

Web/bot clients to update:

- `apps/web/src/lib/api/client.ts` — single `apiFetch` wrapper, add header
  injection.
- `apps/bot/src/services/api.ts` — bot's storefront client.

## 5. Migration phases

### Phase 0 — Decide the base-class taxonomy

Three base classes after this is done:

| Base | Use for | Auth |
|---|---|---|
| `Labor::Api::V3::Store::BaseController` (NEW, extends `Spree::Api::V3::Store::BaseController`) | Public + user-token endpoints called from web/bot | publishable-key |
| `Labor::Api::V3::PlatformBaseController` (NEW, extends `Spree::Api::V3::BaseController`) | Internal platform-style endpoints if any | platform-key (none today) |
| `Labor::Api::V3::WebhookBaseController` (NEW, extends `ActionController::API`) | Payment provider webhooks | per-provider (HMAC etc) |

Webhook controllers explicitly OPT OUT of the publishable-key requirement.
Do not parent them off `V3::Store::Base`.

### Phase 1 — Provision keys (week 1)

1. Generate two publishable keys in `Spree::Store`:
   `web_publishable_key`, `bot_publishable_key`. Store both in
   `Labor::Settings` so they can be rotated without re-deploy.
2. Add `X-Spree-Token` injection in `packages/api-client` / web's
   `apiFetch` and bot's `api.ts`. Read key from `NEXT_PUBLIC_SPREE_TOKEN`
   and `SPREE_TOKEN` env vars respectively. Add them to `.env.example`
   with `REPLACE_ME_*` placeholders.
3. Confirm V2 endpoints still accept the header (they ignore it today, so
   no breakage).
4. Deploy. **No backend change yet.**

Exit criterion: web + bot are sending the header in 100% of storefront
requests in production logs for 7 days.

### Phase 2 — V3 routes in parallel (week 2-3)

1. Create `Labor::Api::V3::Store::BaseController` etc. (Phase 0 taxonomy).
2. For each V2 storefront controller above, create a sibling under
   `apps/backend/app/controllers/spree/api/v3/storefront/` that subclasses
   the new `Labor::Api::V3::Store::BaseController` and `include`s the same
   concerns. Body should be a thin delegation — extract shared logic to
   `Labor::Storefront::*` service objects if not already.
3. Add routes under `namespace :v3 do namespace :storefront do ... end`
   mirroring V2. Keep V2 routes intact.
4. Webhooks: parent off `Labor::Api::V3::WebhookBaseController` (no key
   needed) — but webhook URLs stay as configured with each provider. Do
   NOT change provider webhook URLs in this phase. Treat webhook
   controllers as a relocation under the V3 tree for code-hygiene only;
   route them at both `/api/v2/...` and `/api/v3/...` to allow
   provider-by-provider URL migration later.
5. Add `Sunset: <date>` and `Deprecation: true` headers on all V2
   responses via a before_action on `Spree::Api::V2::BaseController`.
6. Add request specs proving V3 endpoints 401 without `X-Spree-Token` and
   succeed with it; V2 endpoints still succeed without it but emit
   deprecation headers.

Exit criterion: V3 endpoints return identical bodies to V2 (snapshot
test with VCR / `assert_equal` on JSON), all green in CI.

### Phase 3 — Client cutover (week 3-4)

1. Web: flip `apps/web/src/lib/api/*.ts` base URL constant from
   `/api/v2/storefront` to `/api/v3/storefront`. One PR, one constant.
   Rollback = revert single constant.
2. Bot: same for `apps/bot/src/services/api.ts`.
3. Deploy web + bot. Monitor 4xx rate for 48h. Roll back if regression.

Exit criterion: V2 traffic from web/bot drops to zero in prod logs for
7 days. V2 still receives webhook traffic (those have their own URLs
configured with providers — we migrate those last).

### Phase 4 — Webhook URL migration (week 5)

For each provider (Click, Payme, Uzum):

1. Configure new V3 URL in the provider's dashboard.
2. Send a test webhook through the new URL, confirm 200 + the
   `payment_webhook_events` row.
3. After provider confirms cutover, monitor 7 days, then remove the V2
   webhook route.

Order: Uzum → Click → Payme (lowest volume first, highest volume last).
Each provider is independent; one rollback does not affect the others.

### Phase 5 — V2 sunset (week 6+)

1. Stop accepting traffic on `/api/v2/storefront/*` — return `410 Gone`
   with `Sunset` header set to the deprecation date.
2. Keep the V2 controllers + routes in code for one more release as a
   safety net.
3. Next release: delete `spree/api/v2/base_controller.rb` shim, delete
   `spree/api/v2/storefront/*` controllers, delete V2 routes.

## 6. Risk register

| Risk | Mitigation |
|---|---|
| Spree 5.5 drops `Api::V3::Store::BaseController` parent class | Pin Spree to 5.4 during migration; reconcile constants at upgrade time. |
| Publishable key leaks (committed to repo / leaked client-side) | Web key is public by design (it's in JS bundle). Bot key is server-side. Rotate via `Labor::Settings` if compromised; both keys are read-only / non-admin. |
| Webhook downtime during provider URL cutover | Dual-route at both `/api/v2/...` and `/api/v3/...` during phase 4. Switch one provider at a time. |
| Storefront contract drift between V2 and V3 sibling controllers | Snapshot test: hit each endpoint on both routes with the same fixture, assert JSON equality. Run in CI for the full Phase 2-5 duration. |
| Race: web/bot redeploy lands before V3 routes deploy | Backend deploy must precede client deploy by at least 5 min; runbook step. |

## 7. Open questions

1. Should the bot use a separate publishable key from web? (Yes — easier
   to rate-limit and rotate independently.)
2. Do we need a platform key for any internal endpoint, or are all our
   non-public endpoints adequately covered by the user JWT + admin
   Devise auth? (Likely no platform key needed; confirm during Phase 0.)
3. Are there any third-party integrations (analytics, exports) hitting
   `/api/v2/storefront/...`? (Audit nginx access logs over 7 days before
   Phase 1.)

## 8. Success criteria

- Zero requests to `/api/v2/storefront/*` for 7 consecutive days, except
  from provider webhooks (which migrate in Phase 4).
- All V3 endpoints require `X-Spree-Token` and return 401 without it.
- Shim `spree/api/v2/base_controller.rb` deleted, with `git log` showing
  the removal commit references this plan.
- One Spree minor-version upgrade survived without re-introducing the
  shim.

## 9. Out of scope (deferred)

- Migrating `/labor/storefront/...` routes (account, products) to the V3
  shape — those are Labor-native, not under the Spree V2 tree. Track
  separately if convention drift is worth fixing.
- Adding GraphQL or a typed-codegen layer (see P-3 in the review).
