/**
 * Detach the product photographs that show the wrong perfume.
 *
 * The list is in `lib/catalog/wrong-product-images.ts`, where each entry says
 * what the picture actually shows. Read that file first; this one only writes
 * what is decided there.
 *
 * It deletes the ProductImage row, not the file on disk. A card with no image
 * falls back to the product's brand set in type
 * (components/catalog/product-card.tsx:46), which claims only what it knows —
 * the same choice already made for brands without a logo and notes without a
 * photograph. An empty frame is recoverable; a confident picture of a different
 * bottle is not.
 *
 * Matching is (slug, url) so a correct photograph uploaded later survives a
 * re-run. Run this after `import-prod.ts`, which restores the wrong files.
 *
 * Usage: npx tsx scripts/purge-wrong-product-images.ts [--apply]
 */
import { PrismaClient } from '@prisma/client';

import { WRONG_PRODUCT_IMAGES } from '../lib/catalog/wrong-product-images';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  // The url shape differs between the two stores, so the key is matched inside
  // it rather than against it: prod holds the full ActiveStorage url, the local
  // mirror a rewritten path. Narrowed to the listed products first, so a
  // `contains` scan runs over 39 rows and not the whole table.
  const rows = await prisma.productImage.findMany({
    where: { product: { slug: { in: WRONG_PRODUCT_IMAGES.map((w) => w.slug) } } },
    select: { id: true, url: true, product: { select: { slug: true } } },
  });

  const hit: { slug: string; shows: string; id: number }[] = [];
  const miss: string[] = [];
  for (const w of WRONG_PRODUCT_IMAGES) {
    const id = rows.find((r) => r.product.slug === w.slug && r.url.includes(w.storageKey))?.id;
    // Already gone, or the file moved to a different product. Either way the
    // entry no longer describes anything, and saying so is the point of a run.
    if (id === undefined) miss.push(w.slug);
    else hit.push({ slug: w.slug, shows: w.shows, id });
  }

  console.log(`${WRONG_PRODUCT_IMAGES.length} listed, ${hit.length} found`);
  for (const h of hit) console.log(`  ${h.slug.padEnd(28)} ${h.shows}`);
  if (miss.length > 0) console.log(`\nnot in the database (${miss.length}):\n  ${miss.join(' ')}`);

  // A product that keeps a second photograph does not fall back to type, so
  // the deletion leaves it looking fine and needs no follow-up.
  const others = await prisma.product.findMany({
    where: { slug: { in: hit.map((h) => h.slug) } },
    select: { slug: true, _count: { select: { images: true } } },
  });
  const left = others.filter((o) => o._count.images > 1).map((o) => o.slug);
  if (left.length > 0) console.log(`\nkeeps another image (${left.length}):\n  ${left.join(' ')}`);

  if (!APPLY) {
    console.log('\ndry run — pass --apply to write');
    return;
  }

  const { count } = await prisma.productImage.deleteMany({
    where: { id: { in: hit.map((h) => h.id) } },
  });
  console.log(`\ndeleted ${count} image rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
