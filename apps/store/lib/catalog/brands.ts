import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import type { BrandDTO } from '@/lib/catalog/types';

const brandSelect = {
  slug: true,
  name: true,
  country: true,
  niche: true,
  description: true,
  _count: { select: { products: true } },
};

type BrandRow = {
  slug: string;
  name: string;
  country: string | null;
  niche: boolean;
  description: unknown;
  _count: { products: number };
};

const toBrand = (row: BrandRow): BrandDTO => ({
  slug: row.slug,
  name: row.name,
  ...(row.country ? { country: row.country } : {}),
  niche: row.niche,
  // `products` is the FragranceDetail back-relation → one per product.
  product_count: row._count.products,
});

export const getBrands = async (_locale: string): Promise<BrandDTO[]> => {
  const rows = await db.brand.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: brandSelect,
  });

  return rows.map(toBrand);
};

export const getBrand = async (slug: string, locale: string): Promise<(BrandDTO & { description: string }) | null> => {
  const row = await db.brand.findUnique({
    where: { slug },
    select: brandSelect,
  });

  if (!row) {
    return null;
  }

  return {
    ...toBrand(row),
    description: resolveLocaleText(row.description, locale),
  };
};
