/**
 * Fill the gaps in the brand logo manifest from Wikidata.
 *
 * 38 of the 102 active brands have no logo file, and the brand grid falls back
 * to a bottle photograph or the brand's initial for those — three different
 * kinds of object in one grid. This fetches what it can so the grid speaks one
 * language.
 *
 * Wikidata rather than a search engine because it is an API with stable
 * semantics: search the label, read property P154 (logo image), resolve the
 * Commons filename through Special:FilePath. Nothing is scraped and nothing is
 * guessed — a brand with no P154 is reported as a miss and left for a human.
 *
 * The result is written to scripts/out/brand-logos.json and the files land in
 * public/brands/. Wiring them into the manifest is a separate, reviewable step.
 *
 * Usage: npx tsx scripts/fetch-brand-logos.ts <slug:Name> [...]
 *        npx tsx scripts/fetch-brand-logos.ts --from <file with slug|Name lines>
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const OUT_DIR = join(process.cwd(), 'public/brands');
const REPORT_DIR = join(process.cwd(), 'scripts/out');
const UA = 'labor-parfum-logo-fetch/1.0 (https://laborparfum.com)';

type Row = { slug: string; name: string };
type Result = Row & { status: 'ok' | 'no-entity' | 'no-logo' | 'download-failed'; file?: string; entity?: string; source?: string };

const args = process.argv.slice(2);
const rows: Row[] = (() => {
  if (args[0] === '--from') {
    const path = args[1];
    if (!path) throw new Error('--from needs a file');
    return readFileSync(path, 'utf8')
      .split('\n')
      .filter((l) => l.includes('|'))
      .map((l) => {
        const [slug = '', name = ''] = l.split('|');
        return { slug: slug.trim(), name: name.trim() };
      })
      .filter((r) => r.slug && r.name);
  }
  return args.map((a) => {
    const i = a.indexOf(':');
    return { slug: a.slice(0, i), name: a.slice(i + 1) };
  });
})();

const api = async (url: string): Promise<unknown> => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

/** Wikidata entity ids whose label best matches `name`, most relevant first. */
const searchEntities = async (name: string): Promise<string[]> => {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&uselang=en&limit=6&search=${encodeURIComponent(name)}`;
  const json = (await api(url)) as { search?: { id: string }[] };
  return (json.search ?? []).map((s) => s.id);
};

/** P154 is "logo image"; P18 ("image") is the fallback only for a house whose logo is its wordmark photo. */
const logoFileFor = async (entity: string): Promise<string | null> => {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${entity}&property=P154`;
  const json = (await api(url)) as {
    claims?: { P154?: { mainsnak?: { datavalue?: { value?: string } } }[] };
  };
  return json.claims?.P154?.[0]?.mainsnak?.datavalue?.value ?? null;
};

const download = async (commonsFile: string, slug: string): Promise<string | null> => {
  // SVG is served as-is; a raster original is resized server-side so a 4000px
  // press logo does not land in public/.
  const isSvg = extname(commonsFile).toLowerCase() === '.svg';
  const src = isSvg
    ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsFile)}`
    : `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsFile)}?width=512`;

  const res = await fetch(src, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) return null;

  const ext = isSvg ? '.svg' : extname(commonsFile).toLowerCase() || '.png';
  const file = `${slug}${ext}`;
  writeFileSync(join(OUT_DIR, file), buf);
  return file;
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(REPORT_DIR, { recursive: true });

  const results: Result[] = [];

  for (const row of rows) {
    if (existsSync(join(OUT_DIR, `${row.slug}.svg`)) || existsSync(join(OUT_DIR, `${row.slug}.png`))) {
      results.push({ ...row, status: 'ok', file: `${row.slug}.*`, source: 'already present' });
      continue;
    }

    let entities: string[] = [];
    try {
      entities = await searchEntities(row.name);
    } catch {
      /* fall through to no-entity */
    }
    if (entities.length === 0) {
      results.push({ ...row, status: 'no-entity' });
      continue;
    }

    let done = false;
    for (const entity of entities) {
      let commonsFile: string | null = null;
      try {
        commonsFile = await logoFileFor(entity);
      } catch {
        continue;
      }
      if (!commonsFile) continue;

      const file = await download(commonsFile, row.slug);
      if (file) {
        results.push({
          ...row,
          status: 'ok',
          file,
          entity,
          source: `https://commons.wikimedia.org/wiki/File:${commonsFile.replace(/ /g, '_')}`,
        });
      } else {
        results.push({ ...row, status: 'download-failed', entity });
      }
      done = true;
      break;
    }

    if (!done) results.push({ ...row, status: 'no-logo', entity: entities[0] });
  }

  writeFileSync(join(REPORT_DIR, 'brand-logos.json'), JSON.stringify(results, null, 2));

  const by = (s: Result['status']) => results.filter((r) => r.status === s);
  console.log({
    ok: by('ok').length,
    noEntity: by('no-entity').length,
    noLogo: by('no-logo').length,
    downloadFailed: by('download-failed').length,
  });
  for (const r of results) {
    if (r.status !== 'ok') console.log(`  ${r.status.padEnd(16)} ${r.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
