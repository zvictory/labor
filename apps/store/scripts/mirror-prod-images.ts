/**
 * Mirror the production catalog images into public/ and repoint the rows at the
 * local copies, so local development neither waits on nor depends on the live
 * host for every card. The filename is the storage segment from the production
 * URL, which is already unique per image.
 *
 * Usage: npx tsx scripts/mirror-prod-images.ts
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const OUT_DIR = join(process.cwd(), 'public/products/prod');
const PUBLIC_PREFIX = '/products/prod';

/** https://laborparfum.com/storage/<segment>/<name>.jpg -> "<segment>.jpg" */
const localName = (url: string): string | null => {
  const m = /\/storage\/([^/]+)\/([^/?#]+)$/.exec(url);
  const segment = m?.[1];
  const file = m?.[2];
  if (!segment || !file) return null;
  return `${segment}${extname(file) || '.jpg'}`;
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const rows = await prisma.productImage.findMany({ select: { id: true, url: true } });

  const remote = rows.filter((r) => r.url.startsWith('http'));
  console.log(`${remote.length} remote image rows`);

  let fetched = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const row of remote) {
    const name = localName(row.url);
    if (!name) {
      failed.push(row.url);
      continue;
    }
    const dest = join(OUT_DIR, name);
    if (existsSync(dest)) {
      skipped += 1;
    } else {
      const res = await fetch(row.url);
      if (!res.ok) {
        failed.push(`${res.status} ${row.url}`);
        continue;
      }
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      fetched += 1;
    }
    await prisma.productImage.update({
      where: { id: row.id },
      data: { url: `${PUBLIC_PREFIX}/${name}` },
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
