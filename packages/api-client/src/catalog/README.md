# Catalog API Contracts

Shared catalog contracts belong here so web, bot, backend request specs, and future admin tools agree on the same product-card, product-detail, facet, and search payload shapes.

Use Zod schemas for runtime parsing and exported TypeScript types for consumers. Do not put fetch logic or React hooks in this package; those stay in app-specific delivery layers.

Planned contracts:

| Contract | Purpose |
|---|---|
| `ProductCard` | Compact grid/card DTO with nullable fragrance metadata |
| `ProductDetail` | PDP DTO with notes, accords, perfumers, brand, images, and vote aggregates |
| `CatalogFacets` | Brand, note, family, and gender filter DTOs with counts |
| `SearchResult` | Search response DTO with pagination metadata and suggestions |
