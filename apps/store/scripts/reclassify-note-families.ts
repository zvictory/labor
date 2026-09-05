/**
 * Write lib/catalog/note-families.ts into the database.
 *
 * Product filtering runs on Note.family in SQL (`listProducts({ family })`) and
 * the admin note editor writes the column directly, so the classification has
 * to live in the data, not in a lookup at render time.
 *
 * Run this after `import-prod.ts`: the import carries the source's own families
 * and would otherwise put peach back under GREEN.
 *
 * The two mismatch reports are the point of running it dry first. A slug in the
 * database and not in the map is a note that would silently go unfiled; a slug
 * in the map and not in the database is a rename or a typo in the map.
 *
 * Usage: npx tsx scripts/reclassify-note-families.ts [--apply]
 */
import { PrismaClient } from '@prisma/client';

import { NOTE_FAMILY_BY_SLUG, type NoteFamily } from '../lib/catalog/note-families';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  const notes = await prisma.note.findMany({ select: { slug: true, family: true } });
  const known = new Set(notes.map((n) => n.slug));

  const unmapped = notes.filter((n) => !NOTE_FAMILY_BY_SLUG.has(n.slug)).map((n) => n.slug);
  const stale = [...NOTE_FAMILY_BY_SLUG.keys()].filter((slug) => !known.has(slug));

  const changes = notes
    .map((n) => ({ slug: n.slug, from: n.family, to: NOTE_FAMILY_BY_SLUG.get(n.slug) }))
    .filter(
      (c): c is { slug: string; from: string | null; to: NoteFamily } =>
        c.to !== undefined && c.to !== c.from,
    );

  const counts = new Map<NoteFamily, number>();
  for (const note of notes) {
    const family = NOTE_FAMILY_BY_SLUG.get(note.slug);
    if (family) counts.set(family, (counts.get(family) ?? 0) + 1);
  }

  console.log(`${notes.length} notes, ${changes.length} reclassified`);
  console.log(
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([f, n]) => `  ${f.padEnd(10)} ${n}`)
      .join('\n'),
  );

  if (unmapped.length > 0)
    console.log(`\nin the database, not in the map (${unmapped.length}):\n  ${unmapped.join(' ')}`);
  if (stale.length > 0)
    console.log(`\nin the map, not in the database (${stale.length}):\n  ${stale.join(' ')}`);

  if (!APPLY) {
    console.log('\ndry run — pass --apply to write');
    return;
  }

  for (const { slug, to } of changes) {
    await prisma.note.update({ where: { slug }, data: { family: to } });
  }
  console.log(`\nwrote ${changes.length} families`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
