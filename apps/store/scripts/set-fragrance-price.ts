// Sets every fragrance decant to one price.
//
//   npx tsx scripts/set-fragrance-price.ts           # dry run, prints the plan
//   npx tsx scripts/set-fragrance-price.ts --apply   # writes to the local database
//   npx tsx scripts/set-fragrance-price.ts --sql     # SQL for production, plus the way back
//
// The prices that came out of the import were never the shop's: 331 fragrances
// at 5000 UZS, 62 at 4000, a handful at 6000 and 8000, one at 1000. At roughly
// $0.40 those are a scraped per-ml figure, not what anyone pays for a decant.
// Every decant is one bench rate, so every decant carries one price.
//
// What is NOT a decant, and keeps the price it has:
//  - the Russian-named labor goods: home perfume, car perfume, shower gel,
//    cream soap, diffusers, refill bottles, candles
//  - the same goods spelled in Latin: the Sofderm antiseptics and SAVON soaps,
//    the okiii bottles, the labor cassettes, body lotions and diffusers
//  - the five Casa Tito bottles at 372 000-650 000 UZS. Those are prices
//    somebody set by hand, and they are full bottles rather than decants;
//    dropping them to the decant rate would be a 75% cut nobody asked for.
//
// The rollback file is generated from the live rows, so it restores each
// product's own former price rather than a guess.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const apply = process.argv.includes('--apply');
const emitSql = process.argv.includes('--sql');

/** UZS has no minor unit, so this is 160 000 sum. */
export const DECANT_PRICE_UZS = 160_000;

const CYRILLIC = /[Ѐ-ӿ]/;
const NOT_A_DECANT =
  /\b(antiseptik|savon|krem milo|diffuz\w*|flakon|cassette|body lotion|car parfum|avto parfum)\b/i;
/** Full bottles priced by hand. */
const KEEP_PRICE = new Set([
  'lunario',
  'vanoria',
  'muscavilla',
  'ecstasy-collection',
  'euphoria-collection',
]);

const readName = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    for (const key of ['ru', 'en', 'uz']) if (typeof o[key] === 'string') return o[key] as string;
  }
  return '';
};

const isDecant = (slug: string, name: string): boolean =>
  !CYRILLIC.test(name) && !NOT_A_DECANT.test(name) && !KEEP_PRICE.has(slug);

const quote = (s: string): string => `'${s.replace(/'/g, "''")}'`;

const main = async (): Promise<void> => {
  const rows = await db.product.findMany({
    select: { id: true, slug: true, name: true, price: true },
  });

  const decants = rows.filter((r) => isDecant(r.slug, readName(r.name)));
  const todo = decants.filter((r) => r.price !== DECANT_PRICE_UZS);
  const skipped = rows.length - decants.length;

  const before = new Map<number, number>();
  for (const p of todo) before.set(p.price, (before.get(p.price) ?? 0) + 1);

  console.log(`${rows.length} products — ${decants.length} decants, ${skipped} left alone`);
  console.log(`${todo.length} to reprice to ${DECANT_PRICE_UZS.toLocaleString('ru-RU')} UZS:`);
  for (const [price, count] of [...before].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(count).padStart(4)} at ${price.toLocaleString('ru-RU')}`);
  }

  if (emitSql) {
    const outDir = join(process.cwd(), 'scripts', 'out');
    mkdirSync(outDir, { recursive: true });
    const forward = todo.map(
      (p) =>
        `UPDATE "Product" SET price = ${DECANT_PRICE_UZS}, "updatedAt" = NOW()\n` +
        `  WHERE slug = ${quote(p.slug)} AND price = ${p.price};`,
    );
    const back = todo.map(
      (p) =>
        `UPDATE "Product" SET price = ${p.price}, "updatedAt" = NOW()\n` +
        `  WHERE slug = ${quote(p.slug)} AND price = ${DECANT_PRICE_UZS};`,
    );
    writeFileSync(
      join(outDir, 'set-fragrance-price.sql'),
      `BEGIN;\n${forward.join('\n')}\nCOMMIT;\n`,
      'utf8',
    );
    writeFileSync(
      join(outDir, 'set-fragrance-price.rollback.sql'),
      `BEGIN;\n${back.join('\n')}\nCOMMIT;\n`,
      'utf8',
    );
    console.log(`\nwrote ${forward.length} statements to scripts/out/set-fragrance-price.sql`);
    console.log(`and the way back to scripts/out/set-fragrance-price.rollback.sql`);
  }

  if (!apply) {
    console.log('\ndry run — pass --apply to write');
    return;
  }
  const result = await db.product.updateMany({
    where: { id: { in: todo.map((p) => p.id) } },
    data: { price: DECANT_PRICE_UZS },
  });
  console.log(`\nrepriced ${result.count}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
