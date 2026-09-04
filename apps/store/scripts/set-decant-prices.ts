/**
 * Pricing basis: the shop sells decants, and the standard decant is 10 ml.
 * 10 ml = 160 000 UZS (16 000 per ml — the same per-ml figure the Create Your
 * Own bench charges), so the site and the counter quote the same number.
 *
 * Accessories and non-fragrance goods (empty flacons, car parfum, cassettes,
 * body lotions, the diffuser) keep the price they carry in production; they are
 * not sold by volume. They are listed on stdout so the split stays auditable.
 *
 * Usage: npx tsx scripts/set-decant-prices.ts [--dry]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DECANT_ML = 10;
const PRICE_PER_ML = 16_000;

/** Matched on the slug, anchored on segment boundaries so "angel-s-share"
 *  is not mistaken for a gel and "boss-bottled" is not mistaken for a bottle. */
const NON_FRAGRANCE = /(^|-)(cassette|flakon|diffuser)(-|$)|(^|-)car-parfum|(^|-)body-lotion/;

async function main() {
  const dry = process.argv.includes('--dry');
  const products = await prisma.product.findMany({ select: { id: true, slug: true, price: true } });

  const accessories = products.filter((p) => NON_FRAGRANCE.test(p.slug));
  const decants = products.filter((p) => !NON_FRAGRANCE.test(p.slug));

  console.log(`decants: ${decants.length}  accessories (left alone): ${accessories.length}`);
  console.log(accessories.map((a) => `  ${a.slug} — ${a.price} UZS`).join('\n'));

  if (dry) return;

  const ids = decants.map((d) => d.id);
  await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { price: DECANT_ML * PRICE_PER_ML },
  });
  await prisma.fragranceDetail.updateMany({
    where: { productId: { in: ids } },
    data: { volumeMl: DECANT_ML },
  });

  const check = await prisma.product.groupBy({
    by: ['price'],
    _count: true,
    orderBy: { _count: { price: 'desc' } },
  });
  console.table(check.map((c) => ({ price: c.price, products: c._count })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
