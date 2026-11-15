export type CatalogQuery = Record<string, string | string[] | undefined>;

/** Keep shared/search campaign URLs intact; only the requested controls change. */
export function catalogHref(
  locale: string,
  current: CatalogQuery,
  overrides: Record<string, string | null>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item) query.append(key, item);
    }
  }
  const suffix = query.toString();
  return `/${locale}/catalog${suffix ? `?${suffix}` : ''}`;
}
