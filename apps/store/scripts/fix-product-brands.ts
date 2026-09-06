// Applies lib/catalog/product-brand-fixes.ts.
//
//   npx tsx scripts/fix-product-brands.ts           # dry run
//   npx tsx scripts/fix-product-brands.ts --apply   # writes locally
//   npx tsx scripts/fix-product-brands.ts --sql     # SQL for production
//
// The brand lives on FragranceDetail, so this moves brandId there rather than
// touching Product. A row is only moved while it still carries the brand the
// manifest recorded, so a second run is a no-op and a row somebody has already
// refiled by hand is left alone.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';

import { PRODUCT_BRAND_FIXES } from '../lib/catalog/product-brand-fixes';

const db = new PrismaClient();
const apply = process.argv.includes('--apply');
const emitSql = process.argv.includes('--sql');

const quote = (s: string): string => `'${s.replace(/'/g, "''")}'`;

const main = async (): Promise<void> => {
  const brandSlugs = [...new Set(PRODUCT_BRAND_FIXES.flatMap((f) => [f.from, f.to]))];
  const brands = await db.brand.findMany({
    where: { slug: { in: brandSlugs } },
    select: { id: true, slug: true },
  });
  const brandId = new Map(brands.map((b) => [b.slug, b.id]));

  const rows = await db.product.findMany({
    where: { slug: { in: PRODUCT_BRAND_FIXES.map((f) => f.slug) } },
    select: { id: true, slug: true, fragrance: { select: { id: true, brandId: true } } },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const todo: { slug: string; fragranceId: number; to: number; toSlug: string }[] = [];
  const done: string[] = [];
  const problems: string[] = [];

  for (const fix of PRODUCT_BRAND_FIXES) {
    const target = brandId.get(fix.to);
    if (target === undefined) {
      problems.push(`${fix.slug}: no brand ${fix.to} in this database`);
      continue;
    }
    const row = bySlug.get(fix.slug);
    if (!row?.fragrance) {
      problems.push(`${fix.slug}: not in this database, or has no fragrance detail`);
      continue;
    }
    if (row.fragrance.brandId === target) {
      done.push(fix.slug);
      continue;
    }
    if (row.fragrance.brandId !== brandId.get(fix.from)) {
      problems.push(`${fix.slug}: expected brand ${fix.from}, found something else — left alone`);
      continue;
    }
    todo.push({ slug: fix.slug, fragranceId: row.fragrance.id, to: target, toSlug: fix.to });
  }

  for (const t of todo) console.log(`${t.slug} -> ${t.toSlug}`);
  console.log(
    `\n${PRODUCT_BRAND_FIXES.length} listed — ${todo.length} to refile, ${done.length} already done, ` +
      `${problems.length} to look at`,
  );
  for (const p of problems) console.log(`   ${p}`);

  if (emitSql) {
    const outDir = join(process.cwd(), 'scripts', 'out');
    mkdirSync(outDir, { recursive: true });
    const stmt = (slug: string, from: string, to: string) =>
      `UPDATE "FragranceDetail" SET "brandId" = (SELECT id FROM "Brand" WHERE slug = ${quote(to)})\n` +
      `  WHERE "productId" = (SELECT id FROM "Product" WHERE slug = ${quote(slug)})\n` +
      `    AND "brandId" = (SELECT id FROM "Brand" WHERE slug = ${quote(from)});`;
    const fixBySlug = new Map(PRODUCT_BRAND_FIXES.map((f) => [f.slug, f]));
    const forward = todo.map((t) => stmt(t.slug, fixBySlug.get(t.slug)!.from, t.toSlug));
    const back = todo.map((t) => stmt(t.slug, t.toSlug, fixBySlug.get(t.slug)!.from));
    writeFileSync(
      join(outDir, 'fix-product-brands.sql'),
      `BEGIN;\n${forward.join('\n')}\nCOMMIT;\n`,
      'utf8',
    );
    writeFileSync(
      join(outDir, 'fix-product-brands.rollback.sql'),
      `BEGIN;\n${back.join('\n')}\nCOMMIT;\n`,
      'utf8',
    );
    console.log(`\nwrote ${forward.length} statements to scripts/out/fix-product-brands.sql`);
    console.log('and the way back to scripts/out/fix-product-brands.rollback.sql');
  }

  if (!apply) {
    console.log('\ndry run — pass --apply to write');
    return;
  }
  for (const t of todo) {
    await db.fragranceDetail.update({ where: { id: t.fragranceId }, data: { brandId: t.to } });
  }
  console.log(`\nrefiled ${todo.length}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
