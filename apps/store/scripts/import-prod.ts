/**
 * One-way mirror: production catalog -> local dev database.
 *
 * Reads the JSONL dump produced from labor_store on the prod host and replaces
 * the local catalog wholesale. Only catalog tables travel; User, Order, Cart,
 * Payment and OtpCode stay on the server.
 *
 * Both ends are Postgres, so `jsonb` columns travel as objects and are written
 * back as objects. (An earlier revision of this script targeted a local SQLite
 * database and flattened them to strings; that divergence is gone.)
 *
 * Usage: npx tsx scripts/import-prod.ts <dump-dir>
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const dir = process.argv[2];
if (!dir) throw new Error('usage: tsx scripts/import-prod.ts <dump-dir>');

const read = (table: string): Record<string, unknown>[] =>
  readFileSync(join(dir, `${table}.jsonl`), 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);

/** Plain String columns. */
const text = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  return typeof v === 'string' ? v : JSON.stringify(v);
};
const textReq = (v: unknown): string => text(v) ?? '';

/** jsonb columns: objects pass through, a serialised object is re-parsed. */
const json = (v: unknown): Prisma.InputJsonValue | undefined => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as Prisma.InputJsonValue;
    } catch {
      return v;
    }
  }
  return v as Prisma.InputJsonValue;
};
const jsonReq = (v: unknown): Prisma.InputJsonValue => json(v) ?? {};
const date = (v: unknown): Date => (typeof v === 'string' ? new Date(v) : new Date());
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback);
const int = (v: unknown): number | null => (typeof v === 'number' ? Math.round(v) : null);

async function main() {
  // Dependents first: they carry FKs onto Product and would block the wipe.
  await prisma.$transaction([
    prisma.cartItem.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.wishlistItem.deleteMany(),
    prisma.vote.deleteMany(),
    prisma.campaignProduct.deleteMany(),
    prisma.productSimilar.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.productPerfumer.deleteMany(),
    prisma.productAccord.deleteMany(),
    prisma.productNote.deleteMany(),
    prisma.fragranceDetail.deleteMany(),
    prisma.product.deleteMany(),
    prisma.perfumer.deleteMany(),
    prisma.accord.deleteMany(),
    prisma.note.deleteMany(),
    prisma.brand.deleteMany(),
  ]);

  await prisma.brand.createMany({
    data: read('Brand').map((r) => ({
      id: r.id as number,
      slug: r.slug as string,
      name: textReq(r.name),
      description: json(r.description),
      story: json(r.story),
      country: (r.country as string) ?? null,
      foundedYear: int(r.foundedYear),
      website: (r.website as string) ?? null,
      niche: Boolean(r.niche),
      active: Boolean(r.active),
      logoUrl: (r.logoUrl as string) ?? null,
      createdAt: date(r.createdAt),
      updatedAt: date(r.updatedAt),
    })),
  });

  await prisma.note.createMany({
    data: read('Note').map((r) => ({
      id: r.id as number,
      slug: r.slug as string,
      name: jsonReq(r.name),
      description: json(r.description),
      family: (r.family as string) ?? null,
      iconUrl: (r.iconUrl as string) ?? null,
      createdAt: date(r.createdAt),
      updatedAt: date(r.updatedAt),
    })),
  });

  await prisma.accord.createMany({
    data: read('Accord').map((r) => ({
      id: r.id as number,
      slug: r.slug as string,
      name: jsonReq(r.name),
      colorHex: (r.colorHex as string) ?? null,
      createdAt: date(r.createdAt),
      updatedAt: date(r.updatedAt),
    })),
  });

  await prisma.perfumer.createMany({
    data: read('Perfumer').map((r) => ({
      id: r.id as number,
      slug: r.slug as string,
      name: textReq(r.name),
      bio: json(r.bio),
      country: (r.country as string) ?? null,
      createdAt: date(r.createdAt),
      updatedAt: date(r.updatedAt),
    })),
  });

  await prisma.product.createMany({
    data: read('Product').map((r) => ({
      id: r.id as number,
      slug: r.slug as string,
      name: jsonReq(r.name),
      description: json(r.description),
      status: (r.status as string) ?? 'active',
      price: num(r.price),
      createdAt: date(r.createdAt),
      updatedAt: date(r.updatedAt),
    })),
  });

  await prisma.fragranceDetail.createMany({
    data: read('FragranceDetail').map((r) => ({
      id: r.id as number,
      productId: r.productId as number,
      brandId: int(r.brandId),
      gender: (r.gender as string) ?? 'unisex',
      concentration: (r.concentration as string) ?? null,
      releaseYear: int(r.releaseYear),
      volumeMl: int(r.volumeMl),
      avgRating: num(r.avgRating),
      avgLongevity: num(r.avgLongevity),
      avgSillage: num(r.avgSillage),
      votesCount: num(r.votesCount),
      reviewsCount: num(r.reviewsCount),
      discontinued: Boolean(r.discontinued),
      loveBreakdown: jsonReq(r.loveBreakdown),
      seasonsBreakdown: jsonReq(r.seasonsBreakdown),
      timeBreakdown: jsonReq(r.timeBreakdown),
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  });

  await prisma.productNote.createMany({
    data: read('ProductNote').map((r) => ({
      id: r.id as number,
      productId: r.productId as number,
      noteId: r.noteId as number,
      pyramidLayer: (r.pyramidLayer as string) ?? 'top',
      position: num(r.position),
    })),
  });

  await prisma.productAccord.createMany({
    data: read('ProductAccord').map((r) => ({
      id: r.id as number,
      productId: r.productId as number,
      accordId: r.accordId as number,
      weight: num(r.weight, 50),
    })),
  });

  await prisma.productPerfumer.createMany({
    data: read('ProductPerfumer').map((r) => ({
      id: r.id as number,
      productId: r.productId as number,
      perfumerId: r.perfumerId as number,
    })),
  });

  await prisma.productImage.createMany({
    data: read('ProductImage').map((r) => ({
      id: r.id as number,
      productId: r.productId as number,
      url: r.url as string,
      alt: (r.alt as string) ?? null,
      position: num(r.position),
    })),
  });

  const counts = {
    brands: await prisma.brand.count(),
    notes: await prisma.note.count(),
    accords: await prisma.accord.count(),
    perfumers: await prisma.perfumer.count(),
    products: await prisma.product.count(),
    fragranceDetails: await prisma.fragranceDetail.count(),
    productNotes: await prisma.productNote.count(),
    productAccords: await prisma.productAccord.count(),
    productPerfumers: await prisma.productPerfumer.count(),
    images: await prisma.productImage.count(),
  };
  console.table(counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
