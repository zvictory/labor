/**
 * Merge perfumers that are the same person recorded twice.
 *
 * The import produced both "Cécile Zarokian" and "Cecile Zarokian" as separate
 * rows, and the same for Jérôme Epinette and Jordi Fernández. The index page
 * listed each of them twice, and their fragrances were split across the two
 * records, so neither entry showed a true count.
 *
 * Keying on the name with its diacritics folded away is what finds them. The
 * accented spelling wins — it is the person's actual name — and every
 * ProductPerfumer link moves onto it before the duplicate goes.
 *
 * Usage: npx tsx scripts/merge-duplicate-perfumers.ts [--apply]
 * Without --apply it only reports what it would do.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const FOLD: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ä: 'a', ã: 'a', å: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', ö: 'o', õ: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ç: 'c', ñ: 'n', ø: 'o', ß: 'ss',
};

const fold = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z ]/g, (ch) => FOLD[ch] ?? ch)
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** The accented spelling is the person's name; prefer it, then the older row. */
const pickKeeper = <T extends { id: number; name: string }>(rows: T[]): T => {
  const accented = rows.filter((r) => fold(r.name) !== r.name.toLowerCase());
  const pool = accented.length > 0 ? accented : rows;
  return pool.reduce((a, b) => (a.id <= b.id ? a : b));
};

async function main() {
  const perfumers = await prisma.perfumer.findMany({
    select: { id: true, slug: true, name: true, _count: { select: { productPerfumers: true } } },
  });

  const groups = new Map<string, typeof perfumers>();
  for (const p of perfumers) {
    const key = fold(p.name);
    const bucket = groups.get(key);
    if (bucket) bucket.push(p);
    else groups.set(key, [p]);
  }

  const dupes = [...groups.values()].filter((g) => g.length > 1);
  if (dupes.length === 0) {
    console.log('no duplicates');
    return;
  }

  for (const group of dupes) {
    const keeper = pickKeeper(group);
    const losers = group.filter((p) => p.id !== keeper.id);
    console.log(
      `keep  ${keeper.name} (#${keeper.id}, ${keeper._count.productPerfumers} links)\n` +
        losers
          .map((l) => `  drop ${l.name} (#${l.id}, ${l._count.productPerfumers} links)`)
          .join('\n'),
    );

    if (!APPLY) continue;

    for (const loser of losers) {
      const links = await prisma.productPerfumer.findMany({
        where: { perfumerId: loser.id },
        select: { productId: true },
      });

      for (const { productId } of links) {
        // The pair is unique, so a product already credited to the keeper would
        // collide: drop that link rather than move it.
        const exists = await prisma.productPerfumer.findFirst({
          where: { perfumerId: keeper.id, productId },
          select: { productId: true },
        });
        if (exists) {
          await prisma.productPerfumer.deleteMany({
            where: { perfumerId: loser.id, productId },
          });
        } else {
          await prisma.productPerfumer.updateMany({
            where: { perfumerId: loser.id, productId },
            data: { perfumerId: keeper.id },
          });
        }
      }

      await prisma.perfumer.delete({ where: { id: loser.id } });
    }
  }

  if (!APPLY) console.log('\ndry run — pass --apply to write');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
