/**
 * Put a downloaded wordmark into the page's ink.
 *
 * Niche houses run dark sites, so nearly every logo they publish is white on
 * transparent — invisible on an off-white card. These are monochrome wordmarks,
 * and the same wordmark in black is the house's own primary lockup, so the
 * change is a colour swap, not a redesign: the letterforms are untouched.
 *
 * A light logo is repainted graphite and a dark one is left alone, decided by
 * the mean luminance of the pixels that are actually opaque — an all-white
 * wordmark reads near 255, a black one near 0, and nothing in between has
 * turned up. Transparent margins are trimmed so a logo with 200px of padding
 * baked in does not sit smaller than its neighbours in the grid.
 *
 * Usage: npx tsx scripts/normalize-brand-logo.ts <slug> [...]   (reads public/brands/candidates)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

import sharp from 'sharp';

const CANDIDATES = join(process.cwd(), 'public/brands/candidates');
const OUT = join(process.cwd(), 'public/brands');
const INK = { r: 18, g: 18, b: 18 };

/** White in every spelling a hand-written SVG uses. */
const WHITE = /(?:#fff(?:fff)?\b|#FFF(?:FFF)?\b|\bwhite\b|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))/g;

const normalizeSvg = (src: string): string =>
  src.replace(WHITE, `#${INK.r.toString(16).padStart(2, '0').repeat(3)}`);

const normalizePng = async (buf: Buffer): Promise<Buffer> => {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  let seen = 0;
  let clear = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a < 16) {
      clear += 1;
      continue;
    }
    sum += 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
    seen += 1;
  }

  // Repainting only makes sense when the transparency is what shapes the mark.
  // A logo delivered on its own opaque plate reads "light" too, and painting
  // that one flattens the whole tile into a graphite square — which is exactly
  // what happened to Kayali's outlined box the first time through.
  const cutout = clear > (seen + clear) * 0.25;
  const light = cutout && seen > 0 && sum / seen > 140;
  if (light) {
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i + 3] ?? 0) === 0) continue;
      data[i] = INK.r;
      data[i + 1] = INK.g;
      data[i + 2] = INK.b;
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .trim({ threshold: 1 })
    .toBuffer();
};

async function main() {
  const slugs =
    process.argv.slice(2).length > 0
      ? process.argv.slice(2)
      : [...new Set(readdirSync(CANDIDATES).map((f) => f.replace(extname(f), '')))];

  for (const slug of slugs) {
    const file = readdirSync(CANDIDATES).find((f) => f.replace(extname(f), '') === slug);
    if (!file) {
      console.log(`  missing   ${slug}`);
      continue;
    }

    const src = join(CANDIDATES, file);
    const ext = extname(file).toLowerCase();

    if (ext === '.svg') {
      const before = readFileSync(src, 'utf8');
      const after = normalizeSvg(before);
      writeFileSync(join(OUT, `${slug}.svg`), after);
      console.log(`  ${after === before ? 'copied  ' : 'inked   '}  ${slug}.svg`);
      continue;
    }

    if (ext === '.png' || ext === '.webp' || ext === '.jpg' || ext === '.avif') {
      const out = await normalizePng(readFileSync(src));
      writeFileSync(join(OUT, `${slug}.png`), out);
      console.log(`  written    ${slug}.png  ${(out.length / 1024).toFixed(1)}k`);
      continue;
    }

    console.log(`  skipped   ${file} (unsupported)`);
  }

  const stray = slugs.filter((s) => !existsSync(join(OUT, `${s}.svg`)) && !existsSync(join(OUT, `${s}.png`)));
  if (stray.length > 0) console.log(`\nnot written: ${stray.join(' ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
