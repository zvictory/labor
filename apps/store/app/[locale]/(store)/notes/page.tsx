import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { TaxonomyCardImage } from '@/components/catalog/taxonomy-card-image';
import { getNotes } from '@/lib/catalog/notes';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';

type Props = { params: Promise<{ locale: Locale }> };

export default async function NotesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('notes');
  const notes = await getNotes(locale);

  return (
    <main className="container space-y-10 py-12">
      <header className="max-w-2xl space-y-3">
        <p className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          {t('eyebrow')}
        </p>
        <h1 className="font-display text-ink dark:text-bone text-4xl md:text-6xl">{t('title')}</h1>
        <p className="text-ink-muted text-sm dark:text-stone-400">{t('subtitle')}</p>
      </header>
      {notes.length === 0 ? (
        <p className="py-16 text-center text-sm text-stone-500">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {notes.map((note) => (
            <Link
              key={note.slug}
              href={taxonomyHref('note', locale, note.slug)}
              className="group border-border/80 hover:border-foreground rounded-xl border p-4 transition hover:bg-stone-50 dark:hover:bg-[#1A1714]/60"
            >
              <TaxonomyCardImage
                src={note.image}
                alt={note.name}
                mode="contain"
                fallback={
                  <span
                    className="h-2/3 w-2/3"
                    style={{ backgroundColor: note.color_hex ?? '#d6c5ad' }}
                  />
                }
              />
              <h2 className="text-ink group- dark:text-bone font-serif text-base transition hover:underline hover:underline-offset-4">
                {note.name}
              </h2>
              {note.family && (
                <p className="text-brass text-micro mt-1 tracking-widest uppercase">
                  {note.family}
                </p>
              )}
              <p className="mt-3 text-xs text-stone-500">
                {t('productCount', { count: note.product_count })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
