# Taxonomy Images and Accord Pyramid

## Scope

Improve the Next.js-only catalog presentation without changing catalog data or
adding external media sources.

## Taxonomy cards

Brand, note, and perfumer list cards will each expose an optional representative
product image. The data-access queries select the first product image belonging
to a related product, ordered deterministically by product name and image
position. When none exists, the card retains its existing neutral placeholder.

This uses the migrated product images in MinIO, so the presentation works in
every locale and remains independent of Rails.

## Product accord pyramid

The product-detail "main accords" section will render a centered, visual
pyramid. Accords remain sorted by their existing strength order. The strongest
accord appears in the narrow top layer; subsequent accord rows grow wider toward
the base. Each accord retains its catalog-defined color and contrast-correct
text. The separate fragrance note pyramid is unchanged.

## Validation

- Unit-test representative-image mapping, including no-image fallback.
- Unit-test grouping of ordered accords into a top-to-base pyramid.
- Verify TypeScript and Vitest.
- Rebuild the local production container and check English brands, notes,
  perfumers, and a product detail page in the local browser.
