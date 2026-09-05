import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { TaxonomyCardImage } from '@/components/catalog/taxonomy-card-image';
import { BlockMarker } from '@/components/catalog/index-block';
import { getNotes } from '@/lib/catalog/notes';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';
import type { NoteDTO } from '@/lib/catalog/types';

type Props = { params: Promise<{ locale: Locale }> };

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

const groupByFamily = (notes: readonly NoteDTO[]): Family[] => {
  const groups = new Map<string, NoteDTO[]>();
  for (const note of notes) {
    const key = note.family ?? UNCLASSIFIED;
    const bucket = groups.get(key);
    if (bucket) bucket.push(note);
    else groups.set(key, [note]);
  }

  const named = [...groups.entries()]
    .filter(([key]) => key !== UNCLASSIFIED)
    .map(([key, rows]) => ({ key, label: key, notes: rows }))
    .sort((a, b) => b.notes.length - a.notes.length || a.label.localeCompare(b.label));

  const rest = groups.get(UNCLASSIFIED);
  return rest ? [...named, { key: UNCLASSIFIED, label: 'Unclassified', notes: rest }] : named;
};

export default async function NotesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('notes');
  const notes = await getNotes(locale);
  const families = groupByFamily(notes);

  return (
    <main className="container space-y-10 py-12">
      <header className="max-w-2xl space-y-3">
        <p className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          {t('eyebrow')}
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.02em] md:text-6xl">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        <p className="text-muted-foreground text-label font-mono tracking-[0.16em] uppercase">
          {notes.length} notes · {families.length} families
        </p>
      </header>

      {notes.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">{t('empty')}</p>
      ) : (
        <div className="space-y-14">
          {families.map((family) => (
            <section key={family.key} className="space-y-5">
              <BlockMarker label={family.label} position={`${family.notes.length} notes`} />
              <h2 className="sr-only">{family.label}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                {family.notes.map((note) => (
                  <Link
                    key={note.slug}
                    href={taxonomyHref('note', locale, note.slug)}
                    className="group border-border hover:border-foreground flex flex-col border transition-colors"
                  >
                    <div className="border-border border-b">
                      <TaxonomyCardImage
                        src={note.image}
                        alt={note.name}
                        mode="cover"
                        fallback={
                          <span className="text-muted-foreground text-micro font-mono uppercase">
                            {note.name.slice(0, 2)}
                          </span>
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1 p-3">
                      <p className="text-sm leading-tight font-semibold tracking-[-0.01em]">
                        {note.name}
                      </p>
                      <span className="text-muted-foreground text-micro font-mono tabular-nums">
                        {t('productCount', { count: note.product_count })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
