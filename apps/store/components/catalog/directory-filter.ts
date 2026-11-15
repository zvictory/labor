import type { Locale } from '@/i18n/config';

// Filter within each family/block so a search never drops matches beyond the
// first block or moves a note into a different family.
export function filterDirectory<T extends { items: { name: string; searchTerms?: string[] }[] }>(
  groups: T[],
  query: string,
  locale: Locale,
): T[] {
  const needle = query.trim().toLocaleLowerCase(locale);
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        [item.name, ...(item.searchTerms ?? [])].some((term) =>
          term.toLocaleLowerCase(locale).includes(needle),
        ),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
