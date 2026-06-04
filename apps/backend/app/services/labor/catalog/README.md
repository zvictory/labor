# Labor::Catalog

Catalog Core owns read-side product discovery for the storefront: product list, product detail metadata, filters, facets, search ranking, and cache-key composition.

Keep these files free of payment, checkout, Telegram, harvest-fetch, and admin-import behavior. Services in this namespace should return relations or typed DTO inputs; controllers decide HTTP status and serializers decide JSON shape.

Planned service boundaries:

| Service | Responsibility |
|---|---|
| `ProductScope` | Builds the canonical, filterable, sortable product relation without loading full rows early |
| `FacetSnapshot` | Produces brand, note, family, and gender facet counts from indexed catalog tables |
| `SearchScope` | Builds search/ranking relations while hiding SQL details from controllers |
| `CardPreloader` | Preloads translations, brand, price, image, and top accord associations for card serializers |
