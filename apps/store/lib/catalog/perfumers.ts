import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { resolvePerfumerImage } from '@/lib/catalog/taxonomy-images';
import type { PerfumerDTO } from '@/lib/catalog/types';

export { PERFUMER_IMAGES } from './media-manifest';

const perfumerSelect = {
  slug: true,
  name: true,
  country: true,
  bio: true,
  productPerfumers: {
    orderBy: { productId: 'asc' },
    select: {
      product: {
        select: {
          images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
        },
      },
    },
  },
  _count: { select: { productPerfumers: true } },
} satisfies Prisma.PerfumerSelect;

type PerfumerRow = {
  slug: string;
  name: string;
  country: string | null;
  bio: unknown;
  productPerfumers: { product: { images: { url: string }[] } }[];
  _count: { productPerfumers: number };
};

const toPerfumer = (row: PerfumerRow, locale = 'en'): PerfumerDTO => ({
  slug: row.slug,
  name: row.name,
  image: resolvePerfumerImage({
    slug: row.slug,
    productImageUrls: row.productPerfumers.flatMap(({ product }) =>
      product.images.map(({ url }) => url),
    ),
  }),
  ...(row.country ? { country: row.country } : {}),
  product_count: row._count.productPerfumers,
  bio: resolveLocaleText(row.bio, locale),
});

const FALLBACK_PERFUMERS: PerfumerDTO[] = [
  {
    slug: 'alberto-morillas',
    name: 'Alberto Morillas',
    image: '/perfumers/alberto-morillas.jpg',
    country: 'Spain',
    product_count: 45,
  },
  {
    slug: 'quentin-bisch',
    name: 'Quentin Bisch',
    image: '/perfumers/quentin-bisch.jpg',
    country: 'France',
    product_count: 38,
  },
  {
    slug: 'dominique-ropion',
    name: 'Dominique Ropion',
    image: '/perfumers/dominique-ropion.jpg',
    country: 'France',
    product_count: 52,
  },
  {
    slug: 'francis-kurkdjian',
    name: 'Francis Kurkdjian',
    image: '/perfumers/francis-kurkdjian.jpg',
    country: 'France',
    product_count: 40,
  },
  {
    slug: 'olivier-cresp',
    name: 'Olivier Cresp',
    image: '/perfumers/olivier-cresp.jpg',
    country: 'France',
    product_count: 32,
  },
  {
    slug: 'anne-flipo',
    name: 'Anne Flipo',
    image: '/perfumers/anne-flipo.jpg',
    country: 'France',
    product_count: 28,
  },
];

export const getPerfumers = async (locale: string): Promise<PerfumerDTO[]> => {
  try {
    // A nose with fourteen fragrances in the shop is not the same as one with
    // a single decant, and alphabetical order said they were. Weight first,
    // name only to break ties. `some: {}` drops the noses credited on nothing.
    const rows = await db.perfumer.findMany({
      where: { productPerfumers: { some: {} } },
      orderBy: [{ productPerfumers: { _count: 'desc' } }, { name: 'asc' }],
      select: perfumerSelect,
    });

    if (rows.length === 0) {
      return FALLBACK_PERFUMERS;
    }

    return rows.map((row) => toPerfumer(row, locale));
  } catch (err) {
    console.error('[catalog/perfumers] DB query failed:', err);
    return FALLBACK_PERFUMERS;
  }
};

export const getPerfumer = async (
  slug: string,
  locale: string,
): Promise<(PerfumerDTO & { bio: string }) | null> => {
  const row = await db.perfumer.findUnique({
    where: { slug },
    select: perfumerSelect,
  });

  if (!row) {
    return null;
  }

  return {
    ...toPerfumer(row, locale),
    bio: resolveLocaleText(row.bio, locale),
  };
};
