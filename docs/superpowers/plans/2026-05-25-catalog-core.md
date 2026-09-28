# Catalog Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the fragrance catalog a typed, indexed, modular domain boundary for listing, filtering, search, product detail, and future enrichment.

**Architecture:** Keep Spree as the commerce source of truth, and keep Labor-owned fragrance metadata in `labor_*` tables. Catalog Core is split into backend domain services, storefront API delivery, typed web feature clients, and shared contracts; no import/harvest or payment logic belongs in this module.

**Tech Stack:** Rails 7.1, Spree 5.4, Postgres 15 with `pg_trgm`, Next.js App Router, TypeScript strict, Zod, TanStack Query.

---

## Schema Boundary

| Entity | Source Of Truth | Key Relations | Performance Indexes |
|---|---|---|---|
| Product identity | `spree_products` | One product has one `labor_product_fragrance_detail`; many notes, accords, perfumers | `idx_spree_products_name_trgm`, existing slug/status indexes |
| Brand | `labor_brands` | One brand has many fragrance details; translations via `labor_brand_translations` | existing unique slug, `idx_labor_brands_name_trgm` |
| Fragrance detail | `labor_product_fragrance_details` | One row per Spree product; owns factual metadata and vote aggregates | existing unique product, brand index, new gender/rating lookup indexes |
| Notes | `labor_notes`, `labor_product_notes` | Many-to-many product note pyramid by `pyramid_layer` and `position` | existing note/product indexes, existing family index, new family trigram |
| Accords | `labor_accords`, `labor_product_accords` | Many-to-many product accord weights | existing unique product/accord, existing top-accord lookup |
| Perfumers | `labor_perfumers`, `labor_product_perfumers` | Many-to-many product creators | existing unique slug, new name trigram |

## Directory Layout

| Path | Responsibility |
|---|---|
| `apps/backend/app/services/labor/catalog/` | Backend catalog domain queries, matching, ranking, DTO assembly, and future cache keys |
| `apps/backend/app/controllers/labor/storefront/products_controller.rb` | Storefront delivery for product list and detail; should stay thin and delegate query work into Catalog Core services |
| `apps/backend/app/controllers/spree/api/v2/storefront/*` | Stable `/api/v2/storefront` compatibility endpoints for facets, search, brands, and notes |
| `apps/backend/app/serializers/labor/storefront/` | API DTO formatting only; no DB queries except guarded fallback paths |
| `apps/web/src/features/catalog/` | Web catalog feature boundary: hooks, UI state, page adapters, and typed view models |
| `apps/web/src/lib/api/` | Low-level HTTP calls only; no component state and no catalog-specific ranking logic |
| `packages/api-client/src/catalog/` | Future shared catalog request/response contracts for web, bot, and tests |

## Task 1: Apply Catalog Index Migration

**Files:**
- Create: `apps/backend/db/migrate/20260525000200_add_catalog_core_lookup_indexes.rb`
- Modify: `apps/backend/db/schema.rb`

- [ ] **Step 1: Run the migration**

```bash
docker cp apps/backend/db/migrate/20260525000200_add_catalog_core_lookup_indexes.rb labor-backend-1:/app/db/migrate/20260525000200_add_catalog_core_lookup_indexes.rb
docker exec labor-backend-1 bundle exec rails db:migrate
docker cp labor-backend-1:/app/db/schema.rb apps/backend/db/schema.rb
```

Expected: migration succeeds and `schema.rb` contains `idx_pfd_gender_product`, `idx_pfd_rating_product`, and catalog trigram indexes.

- [ ] **Step 2: Verify indexed query surfaces**

```bash
docker exec labor-backend-1 bundle exec rails runner 'puts ActiveRecord::Base.connection.indexes(:labor_product_fragrance_details).map(&:name).grep(/idx_pfd_/).sort'
docker exec labor-backend-1 bundle exec rails runner 'puts ActiveRecord::Base.connection.indexes(:spree_products).map(&:name).grep(/trgm/).sort'
```

Expected: the new index names are printed.

## Task 2: Move Product Query Logic Behind Catalog Services

**Files:**
- Create: `apps/backend/app/services/labor/catalog/product_scope.rb`
- Create: `apps/backend/spec/services/labor/catalog/product_scope_spec.rb`
- Modify: `apps/backend/app/controllers/labor/storefront/products_controller.rb`

- [ ] **Step 1: Add a failing service spec**

```ruby
RSpec.describe Labor::Catalog::ProductScope do
  it 'returns a relation, not loaded product ids, for brand filtering' do
    scope = described_class.new(params: { filter: { brand: 'sample-brand' } }).relation
    expect(scope).to be_a(ActiveRecord::Relation)
    expect(scope.to_sql).to include('labor_brands')
  end
end
```

- [ ] **Step 2: Implement the service by extracting existing controller query methods**

Move `sorted_collection`, `filtered_collection`, and `canonical_product_ids` out of the controller without changing SQL semantics.

- [ ] **Step 3: Keep the controller as delivery only**

The controller should compute pagination, preload card associations, render serializers, and call `Labor::Catalog::ProductScope.new(params: params).relation`.

## Task 3: Add Typed Web Catalog Contracts

**Files:**
- Create: `packages/api-client/src/catalog/product.ts`
- Create: `packages/api-client/src/catalog/facets.ts`
- Modify: `apps/web/src/lib/api/products.ts`
- Modify: `apps/web/src/lib/api/facets.ts`

- [ ] **Step 1: Define Zod schemas for API responses**

Create schemas for product cards, pagination metadata, facets, and nullable fragrance metadata.

- [ ] **Step 2: Parse API responses at the edge**

Replace untyped response assumptions in `apps/web/src/lib/api/products.ts` and `apps/web/src/lib/api/facets.ts` with schema parsing and explicit error messages.

## Task 4: Confirm No Core Logic Was Added Prematurely

**Files:**
- Read: `apps/backend/app/services/labor/catalog/README.md`
- Read: `apps/web/src/features/catalog/README.md`
- Read: `packages/api-client/src/catalog/README.md`

- [ ] **Step 1: Verify this phase only defines schema and boundaries**

```bash
find apps/backend/app/services/labor/catalog apps/web/src/features/catalog packages/api-client/src/catalog -type f | sort
```

Expected: only README/boundary files exist until you approve core logic implementation.

## Self-Review

- Spec coverage: schema/indexing and DDD layout are defined here; core query extraction and web contracts are planned but not implemented in this phase.
- Placeholder scan: no task relies on TBD behavior; future code tasks name exact files and boundaries.
- Type consistency: backend namespace is `Labor::Catalog`; frontend catalog contracts live under `packages/api-client/src/catalog`.
