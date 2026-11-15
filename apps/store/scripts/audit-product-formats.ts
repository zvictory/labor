// Run from apps/store with the isolated preview DATABASE_URL. Default is read only.
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { resolveLocaleText } from '../lib/catalog/locale';
import {
  getSeparateFormat,
  separateFormatSlugs,
  VOLUME_GROUPS,
} from '../lib/catalog/product-formats';

const snapshotSchema = z.object({
  products: z.array(
    z.object({
      id: z.number().int(),
      slug: z.string(),
      name: z.string(),
      brand_slug: z.string().nullish(),
      price: z.number().int(),
    }),
  ),
});
const snapshot = snapshotSchema.parse(
  JSON.parse(readFileSync(new URL('../lib/catalog/full-catalog.json', import.meta.url), 'utf8')),
);
const historical = new Map(snapshot.products.map((row) => [row.slug, row]));
const db = new PrismaClient();
const apply = process.argv.includes('--apply');
const confirmedDuplicate = { keep: 'symphony-300', archive: 'symphony-300-gr' };

async function main() {
  const changes = await db.$transaction(
    async (tx) => {
      const [identity] = await tx.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
      if (identity?.name !== 'labor_design_check_20261115') {
        throw new Error('Use the isolated labor_design_check_20261115 database');
      }
      const products = await tx.product.findMany({
        where: { status: 'active' },
        select: {
          id: true,
          slug: true,
          name: true,
          price: true,
          fragrance: { select: { volumeMl: true, brand: { select: { slug: true } } } },
        },
      });
      const names = new Map<string, string[]>();
      const corrections = [];
      const priceReview = [];
      for (const product of products) {
        const name = resolveLocaleText(product.name, 'ru');
        const brand = product.fragrance?.brand?.slug;
        const format = getSeparateFormat(product.slug);
        const key = `${brand ?? ''}:${name
          .normalize('NFKC')
          .toLowerCase()
          .replace(/\bgr\b|гр\.?/g, 'g')
          .replace(/\s+/g, ' ')
          .trim()}`;
        names.set(key, [...(names.get(key) ?? []), product.slug]);
        if (!format) continue;

        const old = historical.get(product.slug);
        const matched =
          old && old.id === product.id && old.name === name && old.brand_slug === brand;
        const price =
          matched && old.price > 0 && product.price === 160_000 ? old.price : product.price;
        const currentMl = product.fragrance?.volumeMl ?? null;
        const volumeMl = format.size
          ? format.size.unit === 'ml'
            ? format.size.amount
            : null
          : currentMl === 10
            ? null
            : currentMl;
        if (price === 160_000) {
          priceReview.push({ slug: product.slug, storedPrice: price, historicalPrice: old?.price });
        }
        if (price === product.price && volumeMl === currentMl) continue;

        corrections.push({
          slug: product.slug,
          from: { price: product.price, volumeMl: currentMl },
          to: { price, volumeMl },
        });
        if (!apply) continue;
        if (price !== product.price) {
          const result = await tx.product.updateMany({
            where: { id: product.id, status: 'active', price: product.price },
            data: { price },
          });
          if (result.count !== 1) throw new Error(`Price changed during audit for ${product.slug}`);
        }
        if (volumeMl !== currentMl) {
          const result = await tx.fragranceDetail.updateMany({
            where: { productId: product.id, volumeMl: currentMl },
            data: { volumeMl },
          });
          if (result.count !== 1)
            throw new Error(`Volume changed during audit for ${product.slug}`);
        }
      }
      const duplicateCandidates = [...names.values()].filter((group) => group.length > 1);
      const duplicate = duplicateCandidates.find(
        (group) =>
          group.length === 2 &&
          group.includes(confirmedDuplicate.keep) &&
          group.includes(confirmedDuplicate.archive),
      );
      const archives = [];
      if (duplicate) {
        const candidate = await tx.product.findUniqueOrThrow({
          where: { slug: confirmedDuplicate.archive },
          select: {
            id: true,
            featured: true,
            _count: {
              select: {
                cartItems: true,
                orderItems: true,
                wishlistItems: true,
                campaigns: true,
                votes: true,
              },
            },
          },
        });
        if (!candidate.featured && Object.values(candidate._count).every((count) => count === 0)) {
          archives.push({
            slug: confirmedDuplicate.archive,
            keep: confirmedDuplicate.keep,
            from: 'active',
            to: 'archived',
          });
          if (apply) {
            await tx.product.update({ where: { id: candidate.id }, data: { status: 'archived' } });
          }
        }
      }
      return {
        source: identity.name,
        activeProducts: products.length,
        separateFormats: separateFormatSlugs.length,
        volumeGroups: VOLUME_GROUPS,
        duplicateCandidates,
        archives,
        relatedFormats: separateFormatSlugs.flatMap((slug) => {
          const parent = getSeparateFormat(slug)?.inspiredBy;
          return parent ? [{ slug, parent }] : [];
        }),
        priceReview,
        corrections,
      };
    },
    { timeout: 20_000 },
  );
  console.log(JSON.stringify({ applied: apply, ...changes }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
