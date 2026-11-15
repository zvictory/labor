// Discovery sets as stored: a campaign with a set price. Staff build the
// campaign in /admin/campaigns (title, text, picture, dates, perfumes) and give
// it a price; one 2 ml sample of each of its perfumes then costs that price
// together. The arithmetic is in lib/sets/rules.ts.

import { db } from '@/lib/db';
import { liveCampaignWhere } from '@/lib/catalog/campaigns';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { setOffer, type SampleSetRule } from '@/lib/sets/rules';

/** Every set on sale now, named in `locale`. */
export const liveSampleSets = async (
  locale: string,
  now: Date = new Date(),
): Promise<SampleSetRule[]> => {
  const rows = await db.campaign.findMany({
    where: { ...liveCampaignWhere(now), setPrice: { gt: 0 } },
    select: {
      slug: true,
      title: true,
      setPrice: true,
      products: { select: { productId: true, product: { select: { status: true } } } },
    },
  });
  return rows.flatMap((row) => {
    const offer = setOffer(
      row.setPrice,
      row.products.map((p) => ({ productId: p.productId, active: p.product.status === 'active' })),
    );
    return offer
      ? [
          {
            slug: row.slug,
            title: resolveLocaleText(row.title, locale),
            price: offer.price,
            productIds: offer.productIds,
          },
        ]
      : [];
  });
};
