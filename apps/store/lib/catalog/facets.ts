import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';

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
  // 1. Fetch Brands with count of active products
  const brands = await db.brand.findMany({
    where: { active: true },
    select: {
      slug: true,
      name: true,
      products: {
        where: { product: { status: 'active' } },
        select: { id: true },
      },
    },
  });

  const brandsFacet: FilterOption[] = brands
    .map((b) => ({
      slug: b.slug,
      name: b.name,
      count: b.products.length,
    }))
    .filter((b) => b.count > 0)
    .sort((x, y) => y.count - x.count);

  // 2. Fetch Notes with count of active products
  const notes = await db.note.findMany({
    select: {
      slug: true,
      name: true,
      iconUrl: true,
      productNotes: {
        where: { product: { status: 'active' } },
        select: { id: true },
      },
    },
  });

  const notesFacet: FilterOption[] = notes
    .map((n) => ({
      slug: n.slug,
      name: resolveLocaleText(n.name, locale),
      count: n.productNotes.length,
      icon_url: n.iconUrl,
    }))
    .filter((n) => n.count > 0)
    .sort((x, y) => y.count - x.count);

  // 3. Fetch Distinct note families and count active products
  const noteFamilies = await db.note.findMany({
    select: { family: true },
    distinct: ['family'],
    where: { family: { not: null } },
  });

  const familiesList = noteFamilies
    .map((n) => n.family as string)
    .filter((f) => f && f.trim().length > 0);

  const familiesFacet: FilterOption[] = (
    await Promise.all(
      familiesList.map(async (fam) => {
        const count = await db.product.count({
          where: {
            status: 'active',
            notes: {
              some: {
                note: { family: fam },
              },
            },
          },
        });
        return {
          slug: fam,
          name: fam,
          count,
        };
      })
    )
  )
    .filter((f) => f.count > 0)
    .sort((x, y) => y.count - x.count);

  // 4. Fetch count of active products per Gender
  const genders = ['men', 'women', 'unisex'];
  const gendersFacet: FilterOption[] = await Promise.all(
    genders.map(async (gen) => {
      const count = await db.product.count({
        where: {
          status: 'active',
          fragrance: { gender: gen },
        },
      });
      return {
        slug: gen,
        name: gen,
        count,
      };
    })
  );

  return {
    brands: brandsFacet,
    notes: notesFacet,
    families: familiesFacet,
    genders: gendersFacet.filter((g) => g.count > 0),
  };
};
