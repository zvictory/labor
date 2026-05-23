import Link from 'next/link';
import Image from 'next/image';
import { setRequestLocale, getTranslations } from 'next-intl/server';
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
    className="group relative flex flex-col bg-bone dark:bg-[#1A1714]/30 border border-border/80 rounded-xl overflow-hidden hover:border-brass/70 hover:shadow-xl transition-all duration-500 hover:bg-stone-50 dark:hover:bg-[#1A1714]/60 p-4 space-y-3"
  >
    {/* Product count chip — top-right circle, brass-on-bone */}
    <span
      aria-label={productCountLabel}
      className="absolute top-2 right-2 z-10 inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-brass text-bone text-[11px] font-mono font-bold tabular-nums tracking-tight px-2 shadow-md ring-2 ring-bone dark:ring-[#1A1714]"
    >
      {note.product_count}
    </span>

    <div
      className="relative w-full aspect-square overflow-hidden rounded-lg border border-stone-200/50 shadow-inner"
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

    <div className="space-y-0.5 flex-1 min-w-0">
      <h2 className="font-serif text-base tracking-tight text-ink dark:text-bone group-hover:text-brass transition-colors duration-300 truncate">
        {note.name}
      </h2>
      {note.family ? (
        <span className="block text-[9px] uppercase font-mono tracking-widest text-brass/80 truncate">
          {note.family}
        </span>
      ) : null}
    </div>

    <div className="absolute bottom-0 inset-x-0 h-[2px] bg-brass transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
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
    <main className="mx-auto max-w-7xl px-6 py-16 space-y-12">
      <header className="space-y-4 text-center max-w-2xl mx-auto py-8">
        <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-brass font-bold block">
          {t('eyebrow')}
        </span>
        <h1 className="font-sans font-bold text-4xl md:text-5xl tracking-tight text-ink dark:text-bone">
          {t('title')}
        </h1>
        <div className="h-[1px] w-12 bg-brass mx-auto my-6 opacity-60" />
        <p className="text-sm font-sans leading-relaxed text-ink-muted dark:text-stone-400">
          {t('subtitle')}
        </p>
      </header>

      {loadError ? (
        <div className="text-center text-sm text-stone-500 dark:text-stone-400 py-16">
          {t('errorLoading')}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center text-sm text-stone-500 dark:text-stone-400 py-16">
          {t('empty')}
        </div>
      ) : hasMultipleFamilies ? (
        <div className="space-y-16">
          {Array.from(families.entries()).map(([family, items]) => (
            <section key={family} className="space-y-6">
              <h2 className="text-xs uppercase font-mono tracking-[0.3em] text-brass">
                {family}
              </h2>
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
