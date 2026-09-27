/**
 * Lists public/notes/orbit/*.webp to generate the orbit note manifest.
 * The illustrations are our own (generated, cut out to transparent WebP).
 * The manifest exists so the card query knows which notes have one without
 * touching the filesystem at request time.
 *
 * Usage: npx tsx scripts/build-orbit-manifest.ts (run from apps/store)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
  const root = process.cwd();
  const dir = path.join(root, 'public/notes/orbit');
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.webp')).sort();

  const entries = files.map((f) => {
    const slug = path.basename(f, '.webp');
    const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(slug) ? slug : `'${slug}'`;
    return `  ${key}: '${f}',`;
  });

  const content = [
    '// AUTO-GENERATED — DO NOT EDIT BY HAND.',
    '// Regenerate: npx tsx scripts/build-orbit-manifest.ts',
    '// Maps note slug → filename in /public/notes/orbit/.',
    '',
    'export const ORBIT_NOTE_FILES: Readonly<Record<string, string>> = {',
    ...entries,
    '};',
    '',
  ].join('\n');

  await fs.writeFile(path.join(root, 'lib/catalog/orbit-notes.ts'), content, 'utf-8');
  console.log(`${files.length} orbit notes → lib/catalog/orbit-notes.ts`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
