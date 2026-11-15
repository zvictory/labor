import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { canonicalNoteSlug } from '@/lib/catalog/note-aliases';
import { getSeparateFormat, listingSlug } from '@/lib/catalog/product-formats';

export interface FilterOption {
  slug: string;
  name: string;
  count: number;
  icon_url?: string | null;
}

export interface FilterFacets {
  brands: FilterOption[];
  notes: FilterOption[];
  families: FilterOption[];
  genders: FilterOption[];
}

export const getFilterFacets = async (locale: string): Promise<FilterFacets> => {
  const rows = await db.product.findMany({
    where: { status: 'active' },
    select: {
      slug: true,
      fragrance: {
        select: { gender: true, brand: { select: { slug: true, active: true, name: true } } },
      },
      notes: {
        select: { note: { select: { slug: true, name: true, family: true, iconUrl: true } } },
      },
    },
  });
  const groups = {
    brands: new Map<string, { option: FilterOption; listings: Set<string> }>(),
    notes: new Map<string, { option: FilterOption; listings: Set<string> }>(),
    families: new Map<string, { option: FilterOption; listings: Set<string> }>(),
    genders: new Map<string, { option: FilterOption; listings: Set<string> }>(),
  };
  const add = (key: keyof typeof groups, listing: string, option: Omit<FilterOption, 'count'>) => {
    const group = groups[key].get(option.slug) ?? {
      option: { ...option, count: 0 },
      listings: new Set<string>(),
    };
    group.listings.add(listing);
    groups[key].set(option.slug, group);
  };
  for (const row of rows) {
    const listing = listingSlug(row.slug);
    const brand = row.fragrance?.brand;
    if (brand?.active) add('brands', listing, { slug: brand.slug, name: brand.name });
    const gender = row.fragrance?.gender;
    if (gender) add('genders', listing, { slug: gender, name: gender });
    if (getSeparateFormat(row.slug)?.copiedProfile) continue;
    for (const { note } of row.notes) {
      const slug = canonicalNoteSlug(note.slug);
      add('notes', listing, {
        slug,
        name: resolveLocaleText(note.name, locale),
        icon_url: note.iconUrl,
      });
      if (note.family) add('families', listing, { slug: note.family, name: note.family });
    }
  }
  const options = (key: keyof typeof groups): FilterOption[] =>
    [...groups[key].values()]
      .map(({ option, listings }) => ({ ...option, count: listings.size }))
      .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
  return {
    brands: options('brands'),
    notes: options('notes'),
    families: options('families'),
    genders: options('genders'),
  };
};
