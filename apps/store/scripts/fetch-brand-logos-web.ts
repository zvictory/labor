/**
 * Pull a brand's own wordmark off the brand's own site.
 *
 * Wikidata covered the couture houses and nothing else — niche perfumery is
 * not in it. The house's own homepage is: every one of them puts its wordmark
 * in the header, usually as an SVG.
 *
 * This only reads the HTML and follows what it finds there. It never guesses a
 * file path, only downloads responses that come back as an image, caps them at
 * 512 KB, and records the exact URL each file came from in the report so every
 * logo can be traced back. Nothing here decides whether the picture is right —
 * that is a contact sheet and a pair of eyes, because the failure mode is not
 * an error, it is the Australian Labor Party's logo sitting on a perfume shop.
 *
 * Usage: npx tsx scripts/fetch-brand-logos-web.ts <slug=url> [...]
 *        npx tsx scripts/fetch-brand-logos-web.ts --from <file of slug|name|url lines>
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'public/brands/candidates');
const REPORT = join(process.cwd(), 'scripts/out/brand-logos-web.json');
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const MAX_BYTES = 512 * 1024;

type Target = { slug: string; url: string };
type Result = Target & { status: string; file?: string; source?: string; tried?: number };

const targets: Target[] = (() => {
  const args = process.argv.slice(2);
  if (args[0] === '--from') {
    const path = args[1];
    if (!path) throw new Error('--from needs a file');
    return readFileSync(path, 'utf8')
      .split('\n')
      .map((l) => l.split('|'))
      .filter((p): p is [string, string, string] => p.length >= 3 && Boolean(p[2]?.trim()))
      .map(([slug, , url]) => ({ slug: slug.trim(), url: url.trim() }));
  }
  return args.map((a) => {
    const i = a.indexOf('=');
    return { slug: a.slice(0, i), url: a.slice(i + 1) };
  });
})();

const get = async (url: string, timeoutMs = 20_000): Promise<Response | null> => {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': UA, Accept: '*/*' },
      signal: ctl.signal,
      redirect: 'follow',
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Header images, icons and og:image, most logo-ish first. */
const logoCandidates = (html: string, base: string): string[] => {
  const abs = (raw: string): string | null => {
    try {
      return new URL(raw.replace(/&amp;/g, '&').trim(), base).toString();
    } catch {
      return null;
    }
  };

  const scored: { url: string; score: number }[] = [];
  const push = (raw: string | undefined, score: number) => {
    if (!raw) return;
    const url = abs(raw);
    if (!url || !/^https?:/.test(url)) return;
    if (/\.(gif|mp4|webm)(\?|$)/i.test(url)) return;
    scored.push({ url, score });
  };

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/logo|brand|wordmark/i.test(tag)) continue;
    // Lazy-loaded headers keep the real file in data-src / srcset.
    const src =
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bsrcset=["']([^"',\s]+)/i)?.[1];
    push(src, /\.svg(\?|$)/i.test(src ?? '') ? 100 : 80);
  }

  for (const tag of html.match(/<link\b[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/gi) ?? []) {
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const size = Number(tag.match(/sizes=["'](\d+)/i)?.[1] ?? 0);
    push(href, /\.svg(\?|$)/i.test(href ?? '') ? 60 : size >= 180 ? 40 : 10);
  }

  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  push(og, 20);

  const seen = new Set<string>();
  return scored
    .sort((a, b) => b.score - a.score)
    .map((c) => c.url)
    .filter((u) => (seen.has(u) ? false : (seen.add(u), true)))
    .slice(0, 6);
};

const EXT: Record<string, string> = {
  'image/svg+xml': '.svg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/jpeg': '.jpg',
  'image/avif': '.avif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(join(process.cwd(), 'scripts/out'), { recursive: true });

  const results: Result[] = [];

  for (const target of targets) {
    const page = await get(target.url);
    if (!page || !page.ok) {
      results.push({ ...target, status: page ? `page ${page.status}` : 'page unreachable' });
      continue;
    }

    const html = await page.text();
    const candidates = logoCandidates(html, page.url);
    if (candidates.length === 0) {
      results.push({ ...target, status: 'no candidate in html' });
      continue;
    }

    let saved = false;
    for (const url of candidates) {
      const res = await get(url);
      if (!res || !res.ok) continue;

      const type = (res.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
      const ext = EXT[type];
      if (!ext) continue;

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0 || buf.length > MAX_BYTES) continue;

      const file = `${target.slug}${ext}`;
      writeFileSync(join(OUT_DIR, file), buf);
      results.push({ ...target, status: 'ok', file, source: url, tried: candidates.length });
      saved = true;
      break;
    }

    if (!saved) results.push({ ...target, status: 'no image downloaded', tried: candidates.length });
  }

  // Merge, do not replace. The report is the only record of where each logo
  // came from, and a second run over a different list of brands used to throw
  // away the first run's provenance without saying so.
  const previous: Result[] = existsSync(REPORT)
    ? (JSON.parse(readFileSync(REPORT, 'utf8')) as Result[])
    : [];
  const merged = new Map(previous.map((r) => [r.slug, r]));
  for (const r of results) {
    const kept = merged.get(r.slug);
    // A failed retry must not erase the run that succeeded.
    if (r.status === 'ok' || kept?.status !== 'ok') merged.set(r.slug, r);
  }
  writeFileSync(REPORT, JSON.stringify([...merged.values()], null, 2));
  const ok = results.filter((r) => r.status === 'ok');
  console.log(`ok ${ok.length} / ${results.length}`);
  for (const r of results) if (r.status !== 'ok') console.log(`  ${r.status.padEnd(22)} ${r.slug}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
