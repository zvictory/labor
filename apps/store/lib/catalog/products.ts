import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import type {
  Gender,
  NotePyramidDTO,
  ProductAccordDTO,
  ProductCardDTO,
  ProductDetailDTO,
  ProductNoteDTO,
  ProductPerfumerDTO,
  PyramidLayer,
} from '@/lib/catalog/types';

export const PAGE_SIZE = 24;

export type ProductSort = 'new' | 'popular' | 'price_asc' | 'price_desc';

export interface ListProductsParams {
  locale: string;
  sort?: ProductSort;
  brand?: string;
  note?: string;
  accord?: string;
  perfumer?: string;
  family?: string;
  gender?: string;
  q?: string;
  page?: number;
}

export interface ListProductsResult {
  data: ProductCardDTO[];
  meta: { total: number; totalPages: number };
}

// ── card projection: only what ProductCardDTO needs ────────────────────────────

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  images: {
    orderBy: { position: 'asc' },
    take: 1,
    select: { url: true },
  },
  fragrance: {
    select: {
      avgRating: true,
      votesCount: true,
      reviewsCount: true,
      brand: { select: { name: true } },
    },
  },
  accords: {
    orderBy: { weight: 'desc' },
    take: 1,
    select: {
      accord: { select: { name: true, colorHex: true } },
    },
  },
} satisfies Prisma.ProductSelect;

type ProductCardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

const toProductCard = (row: ProductCardRow, locale: string): ProductCardDTO => {
  const fragrance = row.fragrance;
  const topAccordRow = row.accords[0]?.accord;
  const top_accord =
    topAccordRow && topAccordRow.colorHex
      ? { name: resolveLocaleText(topAccordRow.name, locale), color_hex: topAccordRow.colorHex }
      : null;

  // votesCount is the curated count column; fall back to reviewsCount if 0.
  const votes_count = fragrance ? fragrance.votesCount || fragrance.reviewsCount : 0;

  return {
    id: row.id,
    slug: row.slug,
    name: resolveLocaleText(row.name, locale),
    brand: fragrance?.brand ? fragrance.brand.name : '',
    price: row.price,
    image: row.images[0]?.url ?? '',
    avg_rating: fragrance ? Number(fragrance.avgRating) : 0,
    votes_count,
    top_accord,
  };
};

const buildWhere = (params: ListProductsParams): Prisma.ProductWhereInput => {
  const where: Prisma.ProductWhereInput = { status: 'active' };
  const fragrance: Prisma.FragranceDetailWhereInput = {};

  if (params.brand) {
    fragrance.brand = {
      slug: {
        contains: params.brand,
        mode: 'insensitive',
      },
    };
  }
  if (params.gender) {
    fragrance.gender = params.gender;
  }
  if (Object.keys(fragrance).length > 0) {
    where.fragrance = fragrance;
  }

  if (params.note || params.family) {
    const noteFilter: Prisma.NoteWhereInput = {};
    if (params.note) noteFilter.slug = params.note;
    if (params.family) noteFilter.family = params.family;
    where.notes = { some: { note: noteFilter } };
  }
  if (params.q) {
    // name is per-locale JSON; match across stored locale strings.
    where.OR = [
      { name: { path: ['ru'], string_contains: params.q } },
      { name: { path: ['uz'], string_contains: params.q } },
      { name: { path: ['en'], string_contains: params.q } },
    ];
  }
  if (params.perfumer) {
    where.perfumers = { some: { perfumer: { slug: params.perfumer } } };
  }
  if (params.accord) {
    where.accords = { some: { accord: { slug: params.accord } } };
  }

  return where;
};

const buildOrderBy = (sort: ProductSort | undefined): Prisma.ProductOrderByWithRelationInput => {
  switch (sort) {
    case 'popular':
      return { fragrance: { avgRating: 'desc' } };
    case 'price_asc':
      return { price: 'asc' };
    case 'price_desc':
      return { price: 'desc' };
    case 'new':
    default:
      return { id: 'desc' };
  }
};

export const listProducts = async (params: ListProductsParams): Promise<ListProductsResult> => {
  const page = Math.max(1, params.page ?? 1);
  const where = buildWhere(params);
  const orderBy = buildOrderBy(params.sort);

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: cardSelect,
    }),
  ]);

  return {
    data: rows.map((row) => toProductCard(row, params.locale)),
    meta: { total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
  };
};

// ── product detail ─────────────────────────────────────────────────────────────

const isPyramidLayer = (value: string): value is PyramidLayer =>
  value === 'top' || value === 'middle' || value === 'base';

const normalizeGender = (value: string | undefined): Gender =>
  value === 'men' || value === 'women' || value === 'unisex' ? value : 'unisex';

const toProductNote = (
  note: { slug: string; name: Prisma.JsonValue; family: string | null; iconUrl: string | null },
  locale: string,
): ProductNoteDTO => ({
  slug: note.slug,
  name: resolveLocaleText(note.name, locale),
  ...(note.family ? { family: note.family } : {}),
  ...(note.iconUrl ? { icon_url: note.iconUrl } : {}),
});

export const getProduct = async (
  slug: string,
  locale: string,
): Promise<ProductDetailDTO | null> => {
  const product = await db.product.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      price: true,
      images: {
        orderBy: { position: 'asc' },
        select: { url: true },
      },
      fragrance: {
        select: {
          gender: true,
          concentration: true,
          avgRating: true,
          avgLongevity: true,
          avgSillage: true,
          votesCount: true,
          reviewsCount: true,
          loveBreakdown: true,
          seasonsBreakdown: true,
          timeBreakdown: true,
          brand: { select: { name: true, slug: true } },
        },
      },
      notes: {
        orderBy: { position: 'asc' },
        select: {
          pyramidLayer: true,
          note: { select: { slug: true, name: true, family: true, iconUrl: true } },
        },
      },
      accords: {
        orderBy: { weight: 'desc' },
        select: {
          weight: true,
          accord: { select: { slug: true, name: true, colorHex: true } },
        },
      },
      perfumers: {
        select: {
          perfumer: { select: { slug: true, name: true } },
        },
      },
      similarsFrom: {
        orderBy: { score: 'desc' },
        select: {
          similar: { select: cardSelect },
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  const notes: NotePyramidDTO = { top: [], middle: [], base: [] };
  for (const pn of product.notes) {
    if (isPyramidLayer(pn.pyramidLayer)) {
      notes[pn.pyramidLayer].push(toProductNote(pn.note, locale));
    }
  }

  const accords: ProductAccordDTO[] = product.accords.map((pa) => ({
    slug: pa.accord.slug,
    name: resolveLocaleText(pa.accord.name, locale),
    color_hex: pa.accord.colorHex ?? '',
    weight: pa.weight,
  }));

  const perfumers: ProductPerfumerDTO[] = product.perfumers.map((pp) => ({
    slug: pp.perfumer.slug,
    name: pp.perfumer.name,
  }));

  const similar: ProductCardDTO[] = product.similarsFrom.map((ps) =>
    toProductCard(ps.similar, locale),
  );

  const fragrance = product.fragrance;

  const parseBreakdown = (val: any): Record<string, number> => {
    if (typeof val === 'object' && val !== null) {
      return val as Record<string, number>;
    }
    return {};
  };

  return {
    id: product.id,
    slug: product.slug,
    name: resolveLocaleText(product.name, locale),
    description: resolveLocaleText(product.description, locale),
    brand: fragrance?.brand ? fragrance.brand.name : '',
    ...(fragrance?.brand ? { brand_slug: fragrance.brand.slug } : {}),
    price: product.price,
    image: product.images[0]?.url ?? '',
    images: product.images.map((img) => img.url),
    gender: normalizeGender(fragrance?.gender),
    ...(fragrance?.concentration ? { concentration: fragrance.concentration } : {}),
    avg_rating: fragrance ? Number(fragrance.avgRating) : 0,
    avg_longevity: fragrance ? Number(fragrance.avgLongevity) : 0,
    avg_sillage: fragrance ? Number(fragrance.avgSillage) : 0,
    votes_count: fragrance ? fragrance.votesCount || fragrance.reviewsCount : 0,
    notes,
    accords,
    perfumers,
    similar,
    seasons: parseBreakdown(fragrance?.seasonsBreakdown),
    time: parseBreakdown(fragrance?.timeBreakdown),
    love: parseBreakdown(fragrance?.loveBreakdown),
  };
};
