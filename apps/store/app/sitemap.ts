import type { MetadataRoute } from 'next';

import { locales } from '@/i18n/config';
import { db } from '@/lib/db';
import { absoluteUrl } from '@/lib/seo';
import { liveCampaignWhere } from '@/lib/catalog/campaigns';

// Read at request time: the catalogue lives in Postgres, and the build has no
// database to read it from (the storefront group opts out of prerendering for
// the same reason).
export const dynamic = 'force-dynamic';

// Pages that render content of their own. Note and perfumer detail routes are
// left out: they only redirect to the filtered catalogue. Brands have pages.
const STATIC_PATHS = [
  '',
  '/catalog',
  '/brands',
  '/notes',
  '/perfumers',
  '/find-your-perfume',
  '/delivery',
  '/contacts',
  '/campaigns',
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, brands, campaigns] = await Promise.all([
    db.product.findMany({
      where: { status: 'active' },
      select: { slug: true, updatedAt: true },
      orderBy: { id: 'asc' },
    }),
    // The same brands /brands lists: switched on, with something to sell.
    db.brand.findMany({
      where: { active: true, products: { some: { product: { status: 'active' } } } },
      select: { slug: true, updatedAt: true },
      orderBy: { id: 'asc' },
    }),
    db.campaign.findMany({
      where: liveCampaignWhere(new Date()),
      select: { slug: true, updatedAt: true },
      orderBy: { id: 'asc' },
    }),
  ]);

  // One entry per locale, each listing its siblings, so every language version
  // is submitted rather than only the default one.
  const paths: { path: string; lastModified?: Date }[] = [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...brands.map((b) => ({ path: `/brands/${b.slug}`, lastModified: b.updatedAt })),
    ...campaigns.map((c) => ({ path: `/campaigns/${c.slug}`, lastModified: c.updatedAt })),
    ...products.map((p) => ({ path: `/product/${p.slug}`, lastModified: p.updatedAt })),
  ];

  return paths.flatMap(({ path, lastModified }) => {
    const languages = Object.fromEntries(locales.map((l) => [l, absoluteUrl(`/${l}${path}`)]));
    return locales.map((locale) => ({
      url: languages[locale]!,
      lastModified,
      alternates: { languages },
    }));
  });
}
