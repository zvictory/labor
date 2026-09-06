// Applies lib/catalog/product-name-fixes.ts.
//
//   npx tsx scripts/fix-product-names.ts           # dry run, prints the plan
//   npx tsx scripts/fix-product-names.ts --apply   # writes to the local database
//   npx tsx scripts/fix-product-names.ts --sql     # writes SQL for production
//
// Perfume names are not translated — every row stores the same string under ru,
// en and uz — so all three keys are written with the corrected name. A row is
// touched only while it still reads exactly what the manifest recorded, which
// makes a second run a no-op and makes it safe to run against a database
// somebody has already corrected by hand.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';

import { PRODUCT_NAME_FIXES } from '../lib/catalog/product-name-fixes';

const db = new PrismaClient();
const apply = process.argv.includes('--apply');
const emitSql = process.argv.includes('--sql');

const readName = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    for (const key of ['ru', 'en', 'uz']) if (typeof o[key] === 'string') return o[key] as string;
  }
  return '';
};

const quote = (s: string): string => `'${s.replace(/'/g, "''")}'`;

const main = async (): Promise<void> => {
  const slugs = PRODUCT_NAME_FIXES.map((f) => f.slug);
  const rows = await db.product.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, name: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const todo: { slug: string; id: number; from: string; to: string }[] = [];
  const done: string[] = [];
  const missing: string[] = [];
  const drifted: string[] = [];

  for (const fix of PRODUCT_NAME_FIXES) {
    const row = bySlug.get(fix.slug);
    if (!row) {
      missing.push(fix.slug);
      continue;
    }
    const current = readName(row.name);
    if (current === fix.to) {
      done.push(fix.slug);
      continue;
    }
    if (current !== fix.from) {
      drifted.push(
        `${fix.slug}: expected ${JSON.stringify(fix.from)}, found ${JSON.stringify(current)}`,
      );
      continue;
    }
    todo.push({ slug: fix.slug, id: row.id, from: fix.from, to: fix.to });
  }

  for (const t of todo)
    console.log(`${t.slug}\n   ${JSON.stringify(t.from)}\n-> ${JSON.stringify(t.to)}`);
  console.log(
    `\n${PRODUCT_NAME_FIXES.length} listed — ${todo.length} to rename, ${done.length} already done, ` +
      `${missing.length} not in this database, ${drifted.length} changed since the manifest was written`,
  );
  for (const m of missing) console.log(`   missing: ${m}`);
  for (const d of drifted) console.log(`   drifted: ${d}`);

  if (emitSql) {
    const statements = todo.map(
      (t) =>
        `UPDATE "Product" SET name = jsonb_build_object('ru', ${quote(t.to)}, 'en', ${quote(t.to)}, 'uz', ${quote(t.to)}), "updatedAt" = NOW()\n` +
        `  WHERE slug = ${quote(t.slug)} AND name->>'ru' = ${quote(t.from)};`,
    );
    const outDir = join(process.cwd(), 'scripts', 'out');
    mkdirSync(outDir, { recursive: true });
    const file = join(outDir, 'fix-product-names.sql');
    writeFileSync(file, `BEGIN;\n${statements.join('\n')}\nCOMMIT;\n`, 'utf8');
    console.log(`\nwrote ${statements.length} statements to ${file}`);
  }

  if (!apply) {
    console.log('\ndry run — pass --apply to write');
    return;
  }

  for (const t of todo) {
    await db.product.update({
      where: { id: t.id },
      data: { name: { ru: t.to, en: t.to, uz: t.to } },
    });
  }
  console.log(`\nrenamed ${todo.length}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
