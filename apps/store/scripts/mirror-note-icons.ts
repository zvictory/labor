/**
 * Mirror the note icons into public/ and repoint the rows at the local copies.
 *
 * The icons are photographs of raw materials — a lemon, a resin, a piece of
 * cedar — and they came from fimgs.net, fetched by the visitor's browser on
 * every product page. That is someone else's server on the critical path of
 * ours: if it slows down or stops serving hotlinks, the pyramid renders as a
 * row of broken frames. Mirroring them is what makes it safe to show the
 * photographs at all.
 *
 * Notes with no icon are left alone. They render as a plain chip, which is the
 * honest answer — better than a generic stand-in photograph that says nothing
 * about the material.
 *
 * Usage: npx tsx scripts/mirror-note-icons.ts
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const OUT_DIR = join(process.cwd(), 'public/notes/prod');
const PUBLIC_PREFIX = '/notes/prod';

/** https://fimgs.net/mdimg/sastojci/t.75.jpg -> "t.75.jpg", keyed by slug for clarity. */
const localName = (slug: string, url: string): string => {
  const ext = extname(new URL(url).pathname) || '.jpg';
  return `${slug}${ext}`;
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const rows = await prisma.note.findMany({ select: { id: true, slug: true, iconUrl: true } });

  const remote = rows.filter(
    (r): r is { id: number; slug: string; iconUrl: string } =>
      typeof r.iconUrl === 'string' && r.iconUrl.startsWith('http'),
  );
  console.log(`${remote.length} remote note icons`);

  let fetched = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const row of remote) {
    const name = localName(row.slug, row.iconUrl);
    const dest = join(OUT_DIR, name);

    if (existsSync(dest)) {
      skipped += 1;
    } else {
      try {
        const res = await fetch(row.iconUrl);
        if (!res.ok) {
          failed.push(`${res.status} ${row.slug}`);
          continue;
        }
        writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        fetched += 1;
      } catch (err) {
        failed.push(`${row.slug}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
    }

    await prisma.note.update({
      where: { id: row.id },
      data: { iconUrl: `${PUBLIC_PREFIX}/${name}` },
    });
  }

  console.log({ fetched, alreadyPresent: skipped, failed: failed.length });
  if (failed.length > 0) console.log(failed.slice(0, 10).join('\n'));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
