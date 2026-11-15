import { DirectorySearch } from '@/components/catalog/directory-search';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import Image from 'next/image';
import { notePilotImage, noteLaborAsset, noteRepresentativeLabel } from '@/lib/catalog/note-pilot';
import { getNotes } from '@/lib/catalog/notes';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';
import { pageMetadata } from '@/lib/seo';
import { familyLabel } from '@/lib/catalog/note-families';
import type { NoteDTO } from '@/lib/catalog/types';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'notes' });
  return pageMetadata({ locale, path: '/notes', title: t('title'), description: t('subtitle') });
}

// 411 notes used to arrive as one 24 000-pixel wall with 411 <h2> headings in
// it — no grouping, no way in, and a document outline that told a screen reader
// the page had 411 equal sections.
//
// The families are already in the data, so they do the dividing: eleven blocks
// ordered by how much of the catalogue each one covers, then the 127 notes that
// carry no family at the end under their own honest heading. Now there are
// twelve headings, and the counts say where the shop's weight actually is.

const UNCLASSIFIED = '__none__';

type Family = { key: string; label: string; notes: NoteDTO[] };

type Labels = { family: (key: string) => string; unclassified: string };

const groupByFamily = (notes: readonly NoteDTO[], labels: Labels): Family[] => {
  const groups = new Map<string, NoteDTO[]>();
  for (const note of notes) {
    const key = note.family ?? UNCLASSIFIED;
    const bucket = groups.get(key);
    if (bucket) bucket.push(note);
    else groups.set(key, [note]);
  }

  const named = [...groups.entries()]
    .filter(([key]) => key !== UNCLASSIFIED)
    .map(([key, rows]) => ({ key, label: labels.family(key), notes: rows }))
    .sort((a, b) => b.notes.length - a.notes.length || a.key.localeCompare(b.key));

  const rest = groups.get(UNCLASSIFIED);
  return rest ? [...named, { key: UNCLASSIFIED, label: labels.unclassified, notes: rest }] : named;
};

export default async function NotesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('notes');
  const notes = await getNotes(locale);
  const families = groupByFamily(notes, {
    family: (key) => familyLabel(key, locale),
    unclassified: t('unclassified'),
  });

  return (
    <div className="container space-y-5 py-6 md:space-y-8 md:py-10">
      <header className="grid items-center gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-8">
        <div className="space-y-2">
          <h1 className="page-title">{t('title')}</h1>
          <p className="body-copy">{t('subtitle')}</p>
        </div>
        <div className="bg-muted relative h-[5.5rem] overflow-hidden md:h-36 lg:h-40">
          <Image
            src="/notes/labor-library-header-v1.webp"
            alt=""
            fill
            sizes="(min-width: 1280px) 600px, (min-width: 768px) 46vw, 100vw"
            priority
            className="object-cover"
          />
        </div>
      </header>

      {notes.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">{t('empty')}</p>
      ) : (
        <DirectorySearch
          locale={locale}
          jumpLinks
          variant="minimal-notes"
          groups={families.map((family) => ({
            id: family.key,
            label: family.label,
            items: family.notes.map((note) => ({
              id: note.slug,
              name: note.name,
              searchTerms: note.searchTerms,
              content: (
                <Link
                  key={note.slug}
                  href={taxonomyHref('note', locale, note.slug)}
                  aria-label={`${note.name} — ${t('productCount', { count: note.product_count })}`}
                  className="flex h-full flex-col items-center py-4 text-center hover:opacity-75 focus-visible:outline-offset-4 motion-safe:transition-opacity motion-safe:duration-150"
                >
                  <div className="relative flex aspect-square w-full items-center justify-center">
                    <span
                      aria-hidden="true"
                      className="bg-muted text-muted-foreground absolute top-1 right-1 z-10 flex h-8 w-8 items-center justify-center rounded-[50%] text-xs tabular-nums md:top-3 md:right-3"
                    >
                      {note.product_count}
                    </span>
                    {note.image ? (
                      <Image
                        src={note.image}
                        alt=""
                        fill
                        sizes="(min-width:1024px) 240px, (min-width:640px) 28vw, 42vw"
                        className={
                          notePilotImage(note.slug)
                            ? 'object-contain p-5 md:p-8'
                            : 'object-contain p-5 mix-blend-multiply md:p-8 dark:mix-blend-normal'
                        }
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground px-4 font-serif text-2xl"
                      >
                        {note.name.slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-sm leading-5 font-medium">{note.name}</p>
                  {noteLaborAsset(note.slug)?.representative && (
                    <p className="text-muted-foreground mt-1 text-xs leading-4">
                      {noteRepresentativeLabel(locale)}
                    </p>
                  )}
                </Link>
              ),
            })),
          }))}
        />
      )}
    </div>
  );
}
