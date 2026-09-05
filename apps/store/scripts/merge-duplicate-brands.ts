/**
 * Merge houses recorded twice under two slugs.
 *
 * The catalogue carries "By Kilian" as both `kilian` (8 fragrances) and
 * `by-kilian` (21), Roja Dove as `roja` (1) and `roja-dove` (7), and three more
 * pairs. The brand grid listed each house twice and each entry undercounted, so
 * the ordering — which is by how much of the shop a house holds — was wrong for
 * five of the biggest names in it.
 *
 * The survivor is the row that actually holds the catalogue: most fragrances,
 * then the later import on a tie (that is the one with the properly generated
 * slug — `hermes`, not the mangled `herm-s`). FragranceDetail.brandId is the
 * only reference to a Brand, so moving it is the whole merge.
 *
 * The logo manifest is keyed by slug, so a merge can orphan a logo file: the
 * script prints the remapping it needs rather than editing the manifest itself.
 *
 * Usage: npx tsx scripts/merge-duplicate-brands.ts [--apply]
 */
import { PrismaClient } from '@prisma/client';

import { LOGO_FILES } from '../lib/catalog/media-manifest';

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
    .replace(/./g, (ch) => FOLD[ch] ?? ch)
    .replace(/[^a-z0-9]/g, '');

type Row = { id: number; slug: string; name: string; count: number };

async function main() {
  const brands = await prisma.brand.findMany({
    select: { id: true, slug: true, name: true, _count: { select: { products: true } } },
  });

  const groups = new Map<string, Row[]>();
  for (const b of brands) {
    const row: Row = { id: b.id, slug: b.slug, name: b.name, count: b._count.products };
    const key = fold(b.name);
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  const dupes = [...groups.values()].filter((g) => g.length > 1);
  if (dupes.length === 0) {
    console.log('no duplicates');
    return;
  }

  const remap: string[] = [];

  for (const group of dupes) {
    const [keeper, ...losers] = [...group].sort((a, b) => b.count - a.count || b.id - a.id);
    if (!keeper) continue;

    console.log(
      `keep  ${keeper.name} [${keeper.slug}] #${keeper.id} — ${keeper.count} fragrances\n` +
        losers.map((l) => `  drop ${l.name} [${l.slug}] #${l.id} — ${l.count}`).join('\n'),
    );

    // A logo filed under a slug that is about to disappear has to move, or the
    // house loses its wordmark and falls back to type for no reason.
    if (!LOGO_FILES[keeper.slug]) {
      const donor = losers.find((l) => LOGO_FILES[l.slug]);
      if (donor) remap.push(`  '${keeper.slug}': '${LOGO_FILES[donor.slug]}',  // was keyed '${donor.slug}'`);
    }

    if (!APPLY) continue;

    for (const loser of losers) {
      await prisma.fragranceDetail.updateMany({
        where: { brandId: loser.id },
        data: { brandId: keeper.id },
      });
      await prisma.brand.delete({ where: { id: loser.id } });
    }
  }

  if (remap.length > 0) {
    console.log('\nLOGO_FILES needs these keys (lib/catalog/media-manifest.ts):');
    console.log(remap.join('\n'));
  }
  if (!APPLY) console.log('\ndry run — pass --apply to write');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
