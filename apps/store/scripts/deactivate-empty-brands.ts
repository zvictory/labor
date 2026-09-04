/**
 * Retire brands that carry no product.
 *
 * The imported brand table holds 255 rows, 153 of which have nothing attached —
 * partly real houses we do not stock, partly scraped product pages that landed
 * as brands ("Brandy on the Rocks By Kilian perfume - a fragrance"). They are
 * flagged inactive rather than deleted: the row is the only record we have of
 * how a product got attributed, and a house we do not stock today may be
 * stocked next month.
 *
 * Usage: npx tsx scripts/deactivate-empty-brands.ts [--dry]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dry = process.argv.includes('--dry');

  const empty = await prisma.brand.findMany({
    where: { active: true, products: { none: {} } },
    select: { id: true, slug: true, name: true },
    orderBy: { name: 'asc' },
  });

  console.log(`${empty.length} active brands carry no product`);
  console.log(empty.slice(0, 15).map((b) => `  ${b.name}`).join('\n'));
  if (empty.length > 15) console.log(`  … and ${empty.length - 15} more`);

  if (dry) return;

  const { count } = await prisma.brand.updateMany({
    where: { id: { in: empty.map((b) => b.id) } },
    data: { active: false },
  });

  console.table({
    deactivated: count,
    activeRemaining: await prisma.brand.count({ where: { active: true } }),
    inactiveTotal: await prisma.brand.count({ where: { active: false } }),
  });
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
