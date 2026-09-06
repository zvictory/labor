import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { resolveBrandImage } from '@/lib/catalog/taxonomy-images';
import type { BrandDTO } from '@/lib/catalog/types';

export { LOGO_FILES } from './media-manifest';

// Counts and membership are over ACTIVE products only, the way the catalogue
// counts them. Without the filter /brands said "Tom Ford · 26 ароматов" while
// /catalog?brand=tom-ford found 18 — archived duplicates and drafts were still
// counted here. The ordering below is still by the unfiltered count: Prisma
// cannot filter the relation count it sorts on, and the difference moves a row
// by a place or two, which is not worth fetching every row to sort in memory.
const brandSelect = {
  slug: true,
  name: true,
  country: true,
  niche: true,
  logoUrl: true,
  description: true,
  products: {
    orderBy: { productId: 'asc' },
    select: {
      product: {
        select: {
          images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
        },
      },
    },
  },
  _count: { select: { products: { where: { product: { status: 'active' } } } } },
} satisfies Prisma.BrandSelect;

type BrandRow = {
  slug: string;
  name: string;
  country: string | null;
  niche: boolean;
  logoUrl: string | null;
  description: unknown;
  products: { product: { images: { url: string }[] } }[];
  _count: { products: number };
};

const toBrand = (row: BrandRow, locale = 'en'): BrandDTO => ({
  slug: row.slug,
  name: row.name,
  image: resolveBrandImage({
    slug: row.slug,
    logoUrl: row.logoUrl,
    productImageUrls: row.products.flatMap(({ product }) => product.images.map(({ url }) => url)),
  }),
  ...(row.country ? { country: row.country } : {}),
  niche: row.niche,
  // `products` is the FragranceDetail back-relation → one per product.
  product_count: row._count.products,
  description: resolveLocaleText(row.description, locale),
});

import fullCatalog from '@/lib/catalog/full-catalog.json';
import { LOGO_FILES } from './media-manifest';

const getFallbackBrands = (options?: { take?: number }): BrandDTO[] => {
  const brands = fullCatalog.brands.map((b) => ({
    slug: b.slug,
    name: b.name,
    image: LOGO_FILES[b.slug] ? `/brands/${LOGO_FILES[b.slug]}` : undefined,
    country: b.country,
    niche: b.niche,
    product_count: b.product_count,
  }));

  return options?.take ? brands.slice(0, options.take) : brands;
};

export const getBrands = async (
  locale: string,
  options?: { take?: number },
): Promise<BrandDTO[]> => {
  try {
    const rows = await db.brand.findMany({
      where: { active: true, products: { some: { product: { status: 'active' } } } },
      orderBy: [{ products: { _count: 'desc' } }, { name: 'asc' }],
      take: options?.take,
      select: brandSelect,
    });

    if (rows.length === 0) {
      return getFallbackBrands(options);
    }

    return rows.map((row) => toBrand(row, locale));
  } catch (err) {
    console.error('[catalog/brands] DB query failed:', err);
    return getFallbackBrands(options);
  }
};

export const getBrand = async (
  slug: string,
  locale: string,
): Promise<(BrandDTO & { description: string }) | null> => {
  const row = await db.brand.findUnique({
    where: { slug },
    select: brandSelect,
  });

  if (!row) {
    return null;
  }

  return {
    ...toBrand(row, locale),
    description: resolveLocaleText(row.description, locale),
  };
};

export const BRAND_LOGOS: Record<string, string> = {
  'abercrombie-fitch': 'svg',
  'acqua-di-parma': 'svg',
  ajmal: 'svg',
  amouage: 'svg',
  'arabian-oud': 'webp',
  armani: 'svg',
  'giorgio-armani': 'svg',
  'boadicea-the-victorious': 'webp',
  bvlgari: 'svg',
  byredo: 'svg',
  'carolina-herrera': 'webp',
  'casa-tito': 'webp',
  chanel: 'svg',
  'clive-christian': 'svg',
  creation: 'webp',
  dior: 'svg',
  'dolce-gabbana': 'svg',
  'ensar-oud': 'webp',
  'ermenegildo-zegna': 'svg',
  'escentric-molecules': 'svg',
  escentric: 'svg',
  'essential-parfums': 'svg',
  'ex-nihilo': 'webp',
  genyum: 'svg',
  gucci: 'svg',
  guerlain: 'svg',
  'herm-s': 'svg',
  'hormone-paris': 'webp',
  'hugo-boss': 'svg',
  initio: 'webp',
  'jean-paul-gaultier': 'webp',
  'jo-malone-london': 'webp',
  'juliette-has-a-gun': 'svg',
  kajal: 'webp',
  khaltat: 'webp',
  kilian: 'webp',
  lacoste: 'svg',
  lancome: 'svg',
  'le-labo': 'webp',
  'louis-vuitton': 'svg',
  'maison-crivelli': 'svg',
  'marc-antoine-barrois': 'webp',
  'matiere-premiere': 'webp',
  'memo-paris': 'webp',
  mix: 'svg',
  montale: 'svg',
  moschino: 'svg',
  'narciso-rodriguez': 'webp',
  nasomatto: 'webp',
  okiii: 'webp',
  'parfums-de-marly': 'webp',
  'penhaligon-s': 'webp',
  prada: 'svg',
  roja: 'webp',
  'stefano-ricci': 'webp',
  'tauer-perfumes': 'webp',
  thameen: 'svg',
  'tom-ford': 'svg',
  trussardi: 'svg',
  valentino: 'svg',
  versace: 'svg',
  'victoria-s-secret': 'svg',
  'vilhelm-parfumerie': 'webp',
  xerjoff: 'webp',
  'yves-saint-laurent': 'svg',
  zarkoperfume: 'svg',
};
