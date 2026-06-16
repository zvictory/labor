import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import type { PerfumerDTO } from '@/lib/catalog/types';

const perfumerSelect = {
  slug: true,
  name: true,
  country: true,
  bio: true,
  _count: { select: { productPerfumers: true } },
};

type PerfumerRow = {
  slug: string;
  name: string;
  country: string | null;
  bio: unknown;
  _count: { productPerfumers: number };
};

const toPerfumer = (row: PerfumerRow): PerfumerDTO => ({
  slug: row.slug,
  name: row.name,
  ...(row.country ? { country: row.country } : {}),
  product_count: row._count.productPerfumers,
});

export const getPerfumers = async (_locale: string): Promise<PerfumerDTO[]> => {
  const rows = await db.perfumer.findMany({
    orderBy: { name: 'asc' },
    select: perfumerSelect,
  });

  return rows.map(toPerfumer);
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
    ...toPerfumer(row),
    bio: resolveLocaleText(row.bio, locale),
  };
};
