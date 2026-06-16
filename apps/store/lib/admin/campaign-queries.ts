// Read-side campaign access for the ADMIN console. Campaigns carry per-locale JSON
// text ({ ru, uz, en }), ordered slides, and an ordered featured-product list.
//
// Unlike the storefront queries, the admin needs the RAW per-locale JSON (so the
// edit form can populate every locale field) plus resolved product labels for the
// featured-products picker. Money stays integer UZS minor units.

import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import type { LocaleText } from '@/lib/catalog/types';

/** Coerce arbitrary stored JSON to a LocaleText ({ ru, uz?, en? }), ru required. */
export function toLocaleText(value: unknown): LocaleText {
  if (typeof value === 'string') {
    return { ru: value };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    const str = (k: string): string | undefined =>
      typeof rec[k] === 'string' ? (rec[k] as string) : undefined;
    return {
      ru: str('ru') ?? '',
      ...(str('uz') !== undefined ? { uz: str('uz')! } : {}),
      ...(str('en') !== undefined ? { en: str('en')! } : {}),
    };
  }
  return { ru: '' };
}

const optionalLocaleText = (value: unknown): LocaleText | null => {
  if (value === null || value === undefined) return null;
  const lt = toLocaleText(value);
  return lt.ru.length > 0 || lt.uz || lt.en ? lt : null;
};

/** Row for the admin campaigns list. */
export interface AdminCampaignRow {
  id: number;
  slug: string;
  title: string; // resolved ru (list display)
  active: boolean;
  slidesCount: number;
  productsCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  updatedAt: Date;
}

/** All campaigns, newest-updated first, projected for the admin list. */
export async function listAdminCampaigns(): Promise<AdminCampaignRow[]> {
  const rows = await db.campaign.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      active: true,
      startsAt: true,
      endsAt: true,
      updatedAt: true,
      _count: { select: { slides: true, products: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: resolveLocaleText(r.title, 'ru'),
    active: r.active,
    slidesCount: r._count.slides,
    productsCount: r._count.products,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    updatedAt: r.updatedAt,
  }));
}

export interface AdminCampaignSlide {
  id: number;
  imageUrl: string | null;
  linkUrl: string | null;
  title: LocaleText | null;
  subtitle: LocaleText | null;
  ctaLabel: LocaleText | null;
  position: number;
}

export interface AdminCampaignProduct {
  productId: number;
  slug: string;
  name: string; // resolved ru
  price: number; // integer so'm
  image: string | null;
  position: number;
}

export interface AdminCampaignDetail {
  id: number;
  slug: string;
  title: LocaleText;
  subtitle: LocaleText | null;
  body: LocaleText | null;
  ctaLabel: LocaleText | null;
  heroImage: string | null;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  slides: AdminCampaignSlide[];
  products: AdminCampaignProduct[];
}

/** Full editable campaign detail by id, or null if not found. */
export async function getAdminCampaign(id: number): Promise<AdminCampaignDetail | null> {
  const c = await db.campaign.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      body: true,
      ctaLabel: true,
      heroImage: true,
      active: true,
      startsAt: true,
      endsAt: true,
      slides: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          imageUrl: true,
          linkUrl: true,
          title: true,
          subtitle: true,
          ctaLabel: true,
          position: true,
        },
      },
      products: {
        orderBy: { position: 'asc' },
        select: {
          position: true,
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              price: true,
              images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });

  if (!c) return null;

  return {
    id: c.id,
    slug: c.slug,
    title: toLocaleText(c.title),
    subtitle: optionalLocaleText(c.subtitle),
    body: optionalLocaleText(c.body),
    ctaLabel: optionalLocaleText(c.ctaLabel),
    heroImage: c.heroImage,
    active: c.active,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    slides: c.slides.map((s) => ({
      id: s.id,
      imageUrl: s.imageUrl,
      linkUrl: s.linkUrl,
      title: optionalLocaleText(s.title),
      subtitle: optionalLocaleText(s.subtitle),
      ctaLabel: optionalLocaleText(s.ctaLabel),
      position: s.position,
    })),
    products: c.products.map((p) => ({
      productId: p.product.id,
      slug: p.product.slug,
      name: resolveLocaleText(p.product.name, 'ru'),
      price: p.product.price,
      image: p.product.images[0]?.url ?? null,
      position: p.position,
    })),
  };
}

/**
 * Lightweight product search for the featured-products picker. Matches the query
 * against any stored locale of the product name (ru/uz/en). Returns up to `limit`
 * active products with a resolved ru label + thumbnail.
 */
export async function searchProductsForPicker(
  q: string,
  limit = 20,
): Promise<{ id: number; slug: string; name: string; price: number; image: string | null }[]> {
  const query = q.trim();
  const rows = await db.product.findMany({
    where: {
      status: 'active',
      ...(query
        ? {
            OR: [
              { name: { path: ['ru'], string_contains: query } },
              { name: { path: ['uz'], string_contains: query } },
              { name: { path: ['en'], string_contains: query } },
              { slug: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { id: 'desc' },
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: resolveLocaleText(r.name, 'ru'),
    price: r.price,
    image: r.images[0]?.url ?? null,
  }));
}
