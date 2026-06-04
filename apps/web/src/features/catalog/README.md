# Web Catalog Feature

This boundary owns catalog page composition for Next.js: filter state, query hooks, product-grid view models, search page adapters, and future compare/finder integrations.

Keep low-level HTTP calls in `apps/web/src/lib/api`. Keep shared request/response contracts in `packages/api-client/src/catalog`. Components in this feature should consume typed data and avoid duplicating backend ranking or filtering rules.

Planned layout:

| Path | Responsibility |
|---|---|
| `hooks/` | TanStack Query hooks for products, facets, search, brands, and notes |
| `state/` | URL-backed filter state and small client-only UI state |
| `components/` | Catalog-specific composed UI that wraps shared UI primitives |
| `adapters/` | Conversion from API DTOs to page/view models |
