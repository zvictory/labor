/**
 * Lists public/notes/orbit/*.webp to generate the orbit note manifest.
 * The pictures are our own photographs (generated, cut out to transparent WebP).
 * The manifest exists so the card query knows which notes have one without
 * touching the filesystem at request time.
 *
 * Usage: npx tsx scripts/build-orbit-manifest.ts (run from apps/store)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Fragrantica files one ingredient under more than one note, and the catalogue
// took them all: "Agarwood (Oud)" beside "Agarwood", "Incense" and "Olibanum"
// beside "Frankincense". A product listing another name gets the cut-out.
const ALIASES: Readonly<Record<string, string>> = {
  'agarwood-oud': 'agarwood',
  incense: 'frankincense',
  olibanum: 'frankincense',
};

const entry = (slug: string, file: string) => {
  const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(slug) ? slug : `'${slug}'`;
  return `  ${key}: '${file}',`;
};

async function main() {
  const root = process.cwd();
  const dir = path.join(root, 'public/notes/orbit');
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.webp')).sort();

  const entries = files.map((f) => entry(path.basename(f, '.webp'), f));
  const aliases = Object.entries(ALIASES).map(([slug, target]) => {
    const file = `${target}.webp`;
    if (!files.includes(file)) throw new Error(`Alias ${slug} points at ${file}, which is gone.`);
    return entry(slug, file);
  });

  const content = [
    '// AUTO-GENERATED — DO NOT EDIT BY HAND.',
    '// Regenerate: npx tsx scripts/build-orbit-manifest.ts',
    '// Maps note slug → filename in /public/notes/orbit/.',
    '',
    'export const ORBIT_NOTE_FILES: Readonly<Record<string, string>> = {',
    ...entries,
    '  // The same ingredient under another note name (ALIASES in the script).',
    ...aliases,
    '};',
    '',
  ].join('\n');

  await fs.writeFile(path.join(root, 'lib/catalog/orbit-notes.ts'), content, 'utf-8');
  console.log(
    `${files.length} orbit notes + ${aliases.length} aliases → lib/catalog/orbit-notes.ts`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
