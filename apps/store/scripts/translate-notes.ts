/**
 * Fills in the Russian and Uzbek names of the notes (or, with --accords, the
 * accords) that still read English.
 *
 *   npx tsx scripts/translate-notes.ts            # dry run
 *   npx tsx scripts/translate-notes.ts --apply    # write to the connected DB
 *   npx tsx scripts/translate-notes.ts --sql      # emit SQL + rollback for prod
 *   npx tsx scripts/translate-notes.ts --accords  # same three modes, Accord table
 *
 * A locale key is written only when it is empty or still holds the English
 * string, so a name corrected by hand in the admin is never overwritten and a
 * second run is a no-op. The generated SQL carries the same guard, which is why
 * it is safe to run against production without first diffing the two databases.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

import {
  NOTE_TRANSLATIONS,
  SUPERSEDED_UZ,
  type NoteTranslation,
} from '../lib/catalog/note-translations';
import { ACCORD_TRANSLATIONS } from '../lib/catalog/accord-translations';

const db = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const EMIT_SQL = process.argv.includes('--sql');

// Notes and accords share the { en, ru, uz } name column and the same import
// defect, so one script serves both; only the table, manifest and file names differ.
type Row = { slug: string; name: unknown };
type Target = {
  table: 'Note' | 'Accord';
  out: string;
  manifest: Record<string, NoteTranslation>;
  supersededUz: Readonly<Record<string, string>>;
  read: () => Promise<Row[]>;
  write: (slug: string, name: { en: string; ru: string; uz: string }) => Promise<unknown>;
};

const select = { slug: true, name: true } as const;
const TARGET: Target = process.argv.includes('--accords')
  ? {
      table: 'Accord',
      out: 'translate-accords',
      manifest: ACCORD_TRANSLATIONS,
      supersededUz: {},
      read: () => db.accord.findMany({ select, orderBy: { slug: 'asc' } }),
      write: (slug, name) => db.accord.update({ where: { slug }, data: { name } }),
    }
  : {
      table: 'Note',
      out: 'translate-notes',
      manifest: NOTE_TRANSLATIONS,
      supersededUz: SUPERSEDED_UZ,
      read: () => db.note.findMany({ select, orderBy: { slug: 'asc' } }),
      write: (slug, name) => db.note.update({ where: { slug }, data: { name } }),
    };

interface LocaleName {
  ru: string;
  en: string;
  uz: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readName = (value: unknown): LocaleName | undefined => {
  if (!isRecord(value)) return undefined;
  return {
    ru: typeof value.ru === 'string' ? value.ru : '',
    en: typeof value.en === 'string' ? value.en : '',
    uz: typeof value.uz === 'string' ? value.uz : '',
  };
};

/** Untranslated means absent, or still identical to the English name. */
const isUntranslated = (value: string, en: string): boolean => value === '' || value === en;

const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const main = async (): Promise<void> => {
  const notes = await TARGET.read();

  const updates: { slug: string; before: LocaleName; after: LocaleName }[] = [];
  const skipped: string[] = [];
  const unknown: string[] = [];

  for (const note of notes) {
    const translation = TARGET.manifest[note.slug];
    if (!translation) continue;

    const before = readName(note.name);
    if (!before) {
      unknown.push(note.slug);
      continue;
    }

    const after: LocaleName = {
      en: before.en,
      ru: isUntranslated(before.ru, before.en) ? translation.ru : before.ru,
      uz:
        isUntranslated(before.uz, before.en) || before.uz === TARGET.supersededUz[note.slug]
          ? translation.uz
          : before.uz,
    };

    if (after.ru === before.ru && after.uz === before.uz) {
      skipped.push(note.slug);
      continue;
    }
    updates.push({ slug: note.slug, before, after });
  }

  const manifestSlugs = new Set(Object.keys(TARGET.manifest));
  for (const slug of notes.map((n) => n.slug)) manifestSlugs.delete(slug);

  console.log(`${TARGET.table} manifest: ${Object.keys(TARGET.manifest).length}`);
  console.log(`yazılacak: ${updates.length}`);
  console.log(`zaten çevrili (atlandı): ${skipped.length}`);
  if (manifestSlugs.size > 0) {
    console.log(`veritabanında yok: ${[...manifestSlugs].join(', ')}`);
  }
  if (unknown.length > 0) {
    console.log(`ad alanı okunamadı: ${unknown.join(', ')}`);
  }

  if (EMIT_SQL) {
    // The SQL carries its own guard rather than the row values read above, so
    // it is generated from the manifest alone and stays correct against any
    // database — including production, which is several hundred rows behind the
    // local snapshot this script was developed on. A key is written only when
    // it is null or still equal to the English name, which makes the file
    // idempotent and leaves hand-corrections alone.
    mkdirSync('scripts/out', { recursive: true });
    const backup = `_${TARGET.table.toLowerCase()}_name_backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const forward = Object.entries(TARGET.manifest).map(([slug, t]) => {
      const old = TARGET.supersededUz[slug];
      const oldGuard = old ? ` OR name->>'uz' = ${quote(old)}` : '';
      return (
        `UPDATE "${TARGET.table}" SET name = jsonb_build_object(\n` +
        `    'en', name->>'en',\n` +
        `    'ru', CASE WHEN name->>'ru' IS NULL OR name->>'ru' = name->>'en' THEN ${quote(t.ru)} ELSE name->>'ru' END,\n` +
        `    'uz', CASE WHEN name->>'uz' IS NULL OR name->>'uz' = name->>'en'${oldGuard} THEN ${quote(t.uz)} ELSE name->>'uz' END)\n` +
        `  WHERE slug = ${quote(slug)};`
      );
    });
    writeFileSync(
      `scripts/out/${TARGET.out}.sql`,
      `BEGIN;\nCREATE TABLE IF NOT EXISTS "${backup}" AS SELECT slug, name FROM "${TARGET.table}";\n` +
        `${forward.join('\n')}\nCOMMIT;\n`,
    );
    writeFileSync(
      `scripts/out/${TARGET.out}.rollback.sql`,
      `BEGIN;\nUPDATE "${TARGET.table}" n SET name = b.name FROM "${backup}" b WHERE b.slug = n.slug;\nCOMMIT;\n`,
    );
    console.log(
      `yazıldı: scripts/out/${TARGET.out}.sql (${forward.length} satır, yedek tablo ${backup})`,
    );
  }

  if (!APPLY) {
    console.log('\nkuru çalışma — yazmak için --apply');
    for (const { slug, before, after } of updates.slice(0, 8)) {
      console.log(`  ${slug}: ${before.en} → ru «${after.ru}» / uz «${after.uz}»`);
    }
    await db.$disconnect();
    return;
  }

  for (const { slug, after } of updates) {
    await TARGET.write(slug, { en: after.en, ru: after.ru, uz: after.uz });
  }
  console.log(`\n${updates.length} satır güncellendi (${TARGET.table}).`);
  await db.$disconnect();
};

main().catch(async (error: unknown) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
