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

export const BRAND_LOGOS: Record<string, string> = {
  'abercrombie-fitch': 'svg',
  'acqua-di-parma': 'svg',
  'ajmal': 'svg',
  'amouage': 'svg',
  'arabian-oud': 'webp',
  'armani': 'svg',
  'giorgio-armani': 'svg',
  'boadicea-the-victorious': 'webp',
  'bvlgari': 'svg',
  'byredo': 'svg',
  'carolina-herrera': 'webp',
  'casa-tito': 'webp',
  'chanel': 'svg',
  'clive-christian': 'svg',
  'creation': 'webp',
  'dior': 'svg',
  'dolce-gabbana': 'svg',
  'ensar-oud': 'webp',
  'ermenegildo-zegna': 'svg',
  'escentric-molecules': 'svg',
  'escentric': 'svg',
  'essential-parfums': 'svg',
  'ex-nihilo': 'webp',
  'genyum': 'svg',
  'gucci': 'svg',
  'guerlain': 'svg',
  'herm-s': 'svg',
  'hormone-paris': 'webp',
  'hugo-boss': 'svg',
  'initio': 'webp',
  'jean-paul-gaultier': 'webp',
  'jo-malone-london': 'webp',
  'juliette-has-a-gun': 'svg',
  'kajal': 'webp',
  'khaltat': 'webp',
  'kilian': 'webp',
  'lacoste': 'svg',
  'lancome': 'svg',
  'le-labo': 'webp',
  'louis-vuitton': 'svg',
  'maison-crivelli': 'svg',
  'marc-antoine-barrois': 'webp',
  'matiere-premiere': 'webp',
  'memo-paris': 'webp',
  'mix': 'svg',
  'montale': 'svg',
  'moschino': 'svg',
  'narciso-rodriguez': 'webp',
  'nasomatto': 'webp',
  'okiii': 'webp',
  'parfums-de-marly': 'webp',
  'penhaligon-s': 'webp',
  'prada': 'svg',
  'roja': 'webp',
  'stefano-ricci': 'webp',
  'tauer-perfumes': 'webp',
  'thameen': 'svg',
  'tom-ford': 'svg',
  'trussardi': 'svg',
  'valentino': 'svg',
  'versace': 'svg',
  'victoria-s-secret': 'svg',
  'vilhelm-parfumerie': 'webp',
  'xerjoff': 'webp',
  'yves-saint-laurent': 'svg',
  'zarkoperfume': 'svg',
};

