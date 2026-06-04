import Link from 'next/link';
import Image from 'next/image';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageIntro } from '@/components/page-intro';
import { getNotes, type NoteSummary } from '@/lib/api/notes';

interface Props {
  params: Promise<{ locale: string }>;
}

const groupByFamily = (notes: readonly NoteSummary[]): Map<string, NoteSummary[]> => {
  const map = new Map<string, NoteSummary[]>();
  for (const n of notes) {
    const key = n.family ?? '';
    const bucket = map.get(key);
    if (bucket) bucket.push(n);
    else map.set(key, [n]);
  }
  return map;
};

const NoteCard = ({
  note,
  locale,
  productCountLabel,
}: {
  note: NoteSummary;
  locale: string;
  productCountLabel: string;
}) => (
  <Link
    key={note.slug}
    href={`/${locale}/catalog?note=${note.slug}`}
    className="group bg-bone border-border/80 hover:border-brass/70 relative flex flex-col space-y-3 overflow-hidden rounded-xl border p-4 transition-all duration-500 hover:bg-stone-50 hover:shadow-xl dark:bg-[#1A1714]/30 dark:hover:bg-[#1A1714]/60"
  >
    {/* Product count chip — top-right circle, brass-on-bone */}
    <span
      aria-label={productCountLabel}
      className="bg-brass text-bone ring-bone absolute top-2 right-2 z-10 inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-2 font-mono text-[11px] font-bold tracking-tight tabular-nums shadow-md ring-2 dark:ring-[#1A1714]"
    >
      {note.product_count}
    </span>

    <div
      className="relative aspect-square w-full overflow-hidden rounded-lg border border-stone-200/50 shadow-inner"
      style={{
        background: note.color_hex
          ? `linear-gradient(135deg, ${note.color_hex}33, ${note.color_hex}11)`
          : undefined,
      }}
    >
      {note.icon_url ? (
        <Image
          src={note.icon_url}
          alt={note.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          className="object-contain p-3 drop-shadow transition-transform duration-500 group-hover:scale-105"
        />
      ) : note.color_hex ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            aria-hidden
            className="block h-2/3 w-2/3 rounded-full shadow-md ring-1 ring-black/5"
            style={{ backgroundColor: note.color_hex }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="block h-2/3 w-2/3 rounded-full bg-stone-200 dark:bg-stone-800" />
        </div>
      )}
    </div>

    <div className="min-w-0 flex-1 space-y-0.5">
      <h2 className="text-ink dark:text-bone group-hover:text-brass truncate font-serif text-base tracking-tight transition-colors duration-300">
        {note.name}
      </h2>
      {note.family ? (
        <span className="text-brass/80 block truncate font-mono text-[9px] tracking-widest uppercase">
          {note.family}
        </span>
      ) : null}
    </div>

    <div className="bg-brass absolute inset-x-0 bottom-0 h-[2px] scale-x-0 transform transition-transform duration-500 group-hover:scale-x-100" />
  </Link>
);

export default async function NotesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'notes' });

  let notes: NoteSummary[] = [];
  let loadError = false;
  try {
    const res = await getNotes(locale);
    notes = res.data;
  } catch {
    loadError = true;
  }

  const families = groupByFamily(notes);
  const hasMultipleFamilies =
    families.size > 1 && Array.from(families.keys()).every((k) => k.length > 0);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-4 md:py-6">
      <PageIntro eyebrow={t('eyebrow')} title={t('title')} lead={t('subtitle')} />

      {loadError ? (
        <div className="py-16 text-center text-sm text-stone-500 dark:text-stone-400">
          {t('errorLoading')}
        </div>
      ) : notes.length === 0 ? (
        <div className="py-16 text-center text-sm text-stone-500 dark:text-stone-400">
          {t('empty')}
        </div>
      ) : hasMultipleFamilies ? (
        <div className="space-y-16">
          {Array.from(families.entries()).map(([family, items]) => (
            <section key={family} className="space-y-6">
              <h2 className="text-brass font-mono text-xs tracking-[0.3em] uppercase">{family}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {items.map((note) => (
                  <NoteCard
                    key={note.slug}
                    note={note}
                    locale={locale}
                    productCountLabel={t('productCount', { count: note.product_count })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {notes.map((note) => (
            <NoteCard
              key={note.slug}
              note={note}
              locale={locale}
              productCountLabel={t('productCount', { count: note.product_count })}
            />
          ))}
        </div>
      )}
    </main>
  );
}
