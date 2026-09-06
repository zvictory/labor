// Applies lib/catalog/duplicate-products.ts.
//
//   npx tsx scripts/archive-duplicate-products.ts           # dry run
//   npx tsx scripts/archive-duplicate-products.ts --apply   # writes locally
//   npx tsx scripts/archive-duplicate-products.ts --sql     # SQL for production
//
// Archiving, not deleting: listProducts and the facet counts filter on
// status='active', so an archived row leaves the grid and the counts, while
// getProduct does not filter — its page and every order, cart and wishlist row
// pointing at it keep working. Reversing a group is one UPDATE back to 'active'.
//
// A row is only touched while it is still active, and only after the row meant
// to survive has been found and is active itself. So a second run is a no-op,
// and a group whose keeper is missing is reported rather than half-applied.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';

import { DUPLICATE_PRODUCT_GROUPS } from '../lib/catalog/duplicate-products';

const db = new PrismaClient();
const apply = process.argv.includes('--apply');
const emitSql = process.argv.includes('--sql');

const quote = (s: string): string => `'${s.replace(/'/g, "''")}'`;

const main = async (): Promise<void> => {
  const slugs = DUPLICATE_PRODUCT_GROUPS.flatMap((g) => [g.keep, ...g.archive]);
  const rows = await db.product.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, status: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const todo: { slug: string; id: number; keep: string }[] = [];
  const done: string[] = [];
  const problems: string[] = [];

  for (const group of DUPLICATE_PRODUCT_GROUPS) {
    const keeper = bySlug.get(group.keep);
    if (!keeper) {
      problems.push(`${group.name}: the row meant to stay (${group.keep}) is not in this database`);
      continue;
    }
    if (keeper.status !== 'active') {
      problems.push(`${group.name}: ${group.keep} is ${keeper.status}, so nothing is archived`);
      continue;
    }
    for (const slug of group.archive) {
      const row = bySlug.get(slug);
      if (!row) {
        problems.push(`${group.name}: ${slug} is not in this database`);
        continue;
      }
      if (row.status === 'archived') {
        done.push(slug);
        continue;
      }
      if (row.status !== 'active') {
        problems.push(`${group.name}: ${slug} is ${row.status}, left alone`);
        continue;
      }
      todo.push({ slug, id: row.id, keep: group.keep });
    }
  }

  for (const t of todo) console.log(`archive ${t.slug}  (keeping ${t.keep})`);
  console.log(
    `\n${DUPLICATE_PRODUCT_GROUPS.length} groups — ${todo.length} to archive, ` +
      `${done.length} already archived, ${problems.length} to look at`,
  );
  for (const p of problems) console.log(`   ${p}`);

  if (emitSql) {
    const statements = todo.map(
      (t) =>
        `UPDATE "Product" SET status = 'archived', "updatedAt" = NOW()\n` +
        `  WHERE slug = ${quote(t.slug)} AND status = 'active';`,
    );
    const outDir = join(process.cwd(), 'scripts', 'out');
    mkdirSync(outDir, { recursive: true });
    const file = join(outDir, 'archive-duplicate-products.sql');
    writeFileSync(file, `BEGIN;\n${statements.join('\n')}\nCOMMIT;\n`, 'utf8');
    const back = todo.map(
      (t) =>
        `UPDATE "Product" SET status = 'active', "updatedAt" = NOW()\n` +
        `  WHERE slug = ${quote(t.slug)} AND status = 'archived';`,
    );
    const backFile = join(outDir, 'archive-duplicate-products.rollback.sql');
    writeFileSync(backFile, `BEGIN;\n${back.join('\n')}\nCOMMIT;\n`, 'utf8');
    console.log(
      `\nwrote ${statements.length} statements to ${file}\nand the way back to ${backFile}`,
    );
  }

  if (!apply) {
    console.log('\ndry run — pass --apply to write');
    return;
  }

  await db.product.updateMany({
    where: { id: { in: todo.map((t) => t.id) }, status: 'active' },
    data: { status: 'archived' },
  });
  console.log(`\narchived ${todo.length}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
