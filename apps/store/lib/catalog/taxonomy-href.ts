export type TaxonomyKind = 'brand' | 'note' | 'perfumer';

const FILTER_KEYS: Record<TaxonomyKind, string> = {
  brand: 'brand',
  note: 'note',
  perfumer: 'perfumer',
};

// A brand has a page of its own (app/[locale]/(store)/brands/[slug]); notes and
// perfumers still open the catalogue filtered to them.
export const taxonomyHref = (kind: TaxonomyKind, locale: string, slug: string): string =>
  kind === 'brand'
    ? `/${locale}/brands/${encodeURIComponent(slug)}`
    : `/${locale}/catalog?${FILTER_KEYS[kind]}=${encodeURIComponent(slug)}`;
