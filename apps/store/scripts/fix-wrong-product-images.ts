/**
 * Replace the product photographs that show a different perfume.
 *
 * The list is in `lib/catalog/wrong-product-images.ts`, where each entry says
 * what the picture actually shows and, where one was found and checked by eye,
 * the Fragrantica id of the real perfume. Read that file first; this one only
 * writes what is decided there.
 *
 * An entry with a `fragranticaId` gets the committed file at
 * public/products/fixed/<slug>.jpg. One without loses its image and falls back
 * to the brand set in type (components/catalog/product-card.tsx:46) — the same
 * choice already made for brands without a logo. An empty frame is recoverable;
 * a confident picture of a different bottle is not.
 *
 * The wrong row is found by the ActiveStorage key inside the url, because prod
 * and the local mirror spell the same file differently. Paired with the slug so
 * a photograph added later is left alone. Re-run after `import-prod.ts`, which
 * brings the wrong files back.
 *
 * Usage: npx tsx scripts/fix-wrong-product-images.ts [--apply]
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';

import { WRONG_PRODUCT_IMAGES } from '../lib/catalog/wrong-product-images';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const fixedUrl = (slug: string): string => `/products/fixed/${slug}.jpg`;

async function main() {
  const slugs = WRONG_PRODUCT_IMAGES.map((w) => w.slug);
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, images: { select: { id: true, url: true, position: true } } },
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const replace: { slug: string; productId: number; deleteId?: number; url: string }[] = [];
  const remove: { slug: string; shows: string; deleteId: number }[] = [];
  const noop: string[] = [];
  const missingFile: string[] = [];

  for (const w of WRONG_PRODUCT_IMAGES) {
    const product = bySlug.get(w.slug);
    if (!product) {
      noop.push(`${w.slug} (no such product)`);
      continue;
    }
    const wrong = product.images.find((i) => i.url.includes(w.storageKey));
    const url = fixedUrl(w.slug);
    const already = product.images.some((i) => i.url === url);

    if (w.fragranticaId === null) {
      if (wrong) remove.push({ slug: w.slug, shows: w.shows, deleteId: wrong.id });
      else noop.push(`${w.slug} (already detached)`);
      continue;
    }
    if (!existsSync(join(process.cwd(), 'public', url))) {
      // The manifest promises a file the repo does not have. Deleting the wrong
      // image here would leave the product blank on the strength of a promise.
      missingFile.push(`${w.slug} -> public${url}`);
      continue;
    }
    if (already) {
      noop.push(`${w.slug} (already fixed)`);
      continue;
    }
    replace.push({
      slug: w.slug,
      productId: product.id,
      ...(wrong ? { deleteId: wrong.id } : {}),
      url,
    });
  }

  console.log(
    `${WRONG_PRODUCT_IMAGES.length} listed — ${replace.length} to replace, ` +
      `${remove.length} to detach, ${noop.length} already done`,
  );
  for (const r of replace) console.log(`  fix     ${r.slug.padEnd(28)} ${r.url}`);
  for (const r of remove) console.log(`  detach  ${r.slug.padEnd(28)} showed ${r.shows}`);
  if (noop.length > 0) console.log(`\nno change:\n  ${noop.join('\n  ')}`);
  if (missingFile.length > 0)
    console.log(`\nFILE MISSING (skipped):\n  ${missingFile.join('\n  ')}`);

  if (!APPLY) {
    console.log('\ndry run — pass --apply to write');
    return;
  }

  for (const r of replace) {
    if (r.deleteId !== undefined) await prisma.productImage.delete({ where: { id: r.deleteId } });
    await prisma.productImage.create({
      data: { productId: r.productId, url: r.url, position: 0 },
    });
  }
  if (remove.length > 0) {
    await prisma.productImage.deleteMany({ where: { id: { in: remove.map((r) => r.deleteId) } } });
  }
  console.log(`\nwrote ${replace.length} replacements, deleted ${remove.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
