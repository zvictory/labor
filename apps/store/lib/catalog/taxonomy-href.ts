export type TaxonomyKind = 'brand' | 'note' | 'perfumer';

const FILTER_KEYS: Record<TaxonomyKind, string> = {
  brand: 'brand',
  note: 'note',
  perfumer: 'perfumer',
};

export const taxonomyHref = (kind: TaxonomyKind, locale: string, slug: string): string =>
  `/${locale}/catalog?${FILTER_KEYS[kind]}=${encodeURIComponent(slug)}`;
