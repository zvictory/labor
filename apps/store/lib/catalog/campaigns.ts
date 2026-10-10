// Campaigns as the storefront sees them. Staff build them in /admin/campaigns
// (title, text, hero image, slides, featured products, dates); until now
// nothing outside the admin read them.

import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { listProductsByIds } from '@/lib/catalog/products';
import type { ProductCardDTO } from '@/lib/catalog/types';

export interface CampaignSlideDTO {
  imageUrl: string | null;
  linkUrl: string | null;
  title: string;
  subtitle: string;
  ctaLabel: string;
}

export interface CampaignSummaryDTO {
  slug: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  heroImage: string | null;
  endsAt: Date | null;
  productCount: number;
}

export interface CampaignDTO extends CampaignSummaryDTO {
  body: string;
  slides: CampaignSlideDTO[];
  products: ProductCardDTO[];
}

/**
 * A link staff typed into a slide, if it is a web address or a path on this
 * site. Anything else (javascript:, data:, a typo) is dropped rather than
 * rendered as a link.
 */
export const safeLinkUrl = (raw: string | null): string | null => {
  const url = raw?.trim();
  if (!url) return null;
  return /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url) ? url : null;
};

/** Switched on, and today inside its dates (either end may be open). */
export const liveCampaignWhere = (now: Date): Prisma.CampaignWhereInput => ({
  active: true,
  AND: [
    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
    { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
  ],
});

/** Live campaigns, the one ending soonest first (open-ended ones last). */
export const getLiveCampaigns = async (
  locale: string,
  now: Date = new Date(),
): Promise<CampaignSummaryDTO[]> => {
  const rows = await db.campaign.findMany({
    where: liveCampaignWhere(now),
    orderBy: [{ endsAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    select: {
      slug: true,
      title: true,
      subtitle: true,
      ctaLabel: true,
      heroImage: true,
      endsAt: true,
      _count: { select: { products: { where: { product: { status: 'active' } } } } },
    },
  });
  return rows.map((row) => ({
    slug: row.slug,
    title: resolveLocaleText(row.title, locale),
    subtitle: resolveLocaleText(row.subtitle, locale),
    ctaLabel: resolveLocaleText(row.ctaLabel, locale),
    heroImage: row.heroImage,
    endsAt: row.endsAt,
    productCount: row._count.products,
  }));
};

/** One live campaign with its slides and products, or null. */
export const getLiveCampaign = async (
  slug: string,
  locale: string,
  now: Date = new Date(),
): Promise<CampaignDTO | null> => {
  const row = await db.campaign.findFirst({
    where: { slug, ...liveCampaignWhere(now) },
    select: {
      slug: true,
      title: true,
      subtitle: true,
      body: true,
      ctaLabel: true,
      heroImage: true,
      endsAt: true,
      slides: {
        orderBy: { position: 'asc' },
        select: { imageUrl: true, linkUrl: true, title: true, subtitle: true, ctaLabel: true },
      },
      products: { orderBy: { position: 'asc' }, select: { productId: true } },
    },
  });
  if (!row) return null;

  const products = await listProductsByIds(
    row.products.map((p) => p.productId),
    locale,
  );

  return {
    slug: row.slug,
    title: resolveLocaleText(row.title, locale),
    subtitle: resolveLocaleText(row.subtitle, locale),
    body: resolveLocaleText(row.body, locale),
    ctaLabel: resolveLocaleText(row.ctaLabel, locale),
    heroImage: row.heroImage,
    endsAt: row.endsAt,
    productCount: products.length,
    slides: row.slides.map((s) => ({
      imageUrl: s.imageUrl,
      linkUrl: safeLinkUrl(s.linkUrl),
      title: resolveLocaleText(s.title, locale),
      subtitle: resolveLocaleText(s.subtitle, locale),
      ctaLabel: resolveLocaleText(s.ctaLabel, locale),
    })),
    products,
  };
};
