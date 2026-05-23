import Image from 'next/image';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getPerfumers, type PerfumerSummary } from '@/lib/api/perfumers';
import { PERFUMER_IMAGES } from './perfumer-image-manifest';

interface Props {
  params: Promise<{ locale: string }>;
}

type Lang = 'en' | 'ru' | 'uz' | 'uzc';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz', 'uzc'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

const EYEBROW: Record<Lang, string> = {
  ru: 'НОСЫ И МАСТЕРА',
  en: 'NOSES & MAKERS',
  uz: 'BURUN VA USTALAR',
  uzc: 'БУРУН ВА УСТАЛАР',
};

// First letter of first two whitespace-separated tokens — handles
// "Francis Kurkdjian" → "FK", "Aurélien" → "A", Cyrillic "Софи Лаббе" → "СЛ".
const initialsOf = (name: string): string => {
  const tokens = name.trim().split(/\s+/).slice(0, 2);
  return tokens.map((t) => t.charAt(0).toUpperCase()).join('');
};

const PerfumerAvatar = ({ slug, name }: { slug: string; name: string }) => {
  const file = PERFUMER_IMAGES[slug];
  if (file) {
    return (
      <Image
        src={`/perfumers/${file}`}
        alt={name}
        width={160}
        height={160}
        className="h-full w-full object-cover"
        unoptimized={file.endsWith('.svg')}
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brass/30 via-brass/15 to-brass/5 dark:from-brass/20 dark:via-brass/10 dark:to-transparent">
      <span className="font-serif text-3xl font-medium tracking-wider text-brass">
        {initialsOf(name)}
      </span>
    </div>
  );
};

export default async function PerfumersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('perfumers');
  const lang = toLang(locale);

  let perfumers: PerfumerSummary[] = [];
  let loadError = false;
  try {
    const res = await getPerfumers(locale);
    perfumers = res.data ?? [];
  } catch {
    loadError = true;
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-16 space-y-12">
      <header className="space-y-4 text-center max-w-2xl mx-auto py-8">
        <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-brass font-bold block">
          {EYEBROW[lang]}
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
        <p className="text-center text-sm text-ink-muted dark:text-stone-400">
          {t('errorLoading')}
        </p>
      ) : perfumers.length === 0 ? (
        <p className="text-center text-sm text-ink-muted dark:text-stone-400">
          {t('empty')}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {perfumers.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/${locale}/perfumers/${p.slug}`}
                className="group relative flex flex-col bg-bone dark:bg-[#1A1714]/30 border border-border/80 rounded-xl overflow-hidden hover:border-brass/70 hover:shadow-xl transition-all duration-500 hover:bg-stone-50 dark:hover:bg-[#1A1714]/60"
              >
                {/* Product count chip — top-right circle, brass-on-bone */}
                <span
                  aria-label={t('productCount', { count: p.product_count })}
                  className="absolute top-2 right-2 z-10 inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-brass text-bone text-[11px] font-mono font-bold tabular-nums tracking-tight px-2 shadow-md ring-2 ring-bone dark:ring-[#1A1714]"
                >
                  {p.product_count}
                </span>

                <div className="relative aspect-square w-full overflow-hidden border-b border-border/60">
                  <PerfumerAvatar slug={p.slug} name={p.name} />
                  {p.country && (
                    <span className="absolute top-2 left-2 bg-bone/90 dark:bg-[#1A1714]/80 backdrop-blur-sm px-2 py-0.5 text-[8px] font-mono tracking-[0.2em] text-stone-500 dark:text-stone-400 uppercase font-semibold rounded">
                      {p.country}
                    </span>
                  )}
                </div>

                <div className="p-4 min-w-0">
                  <h2 className="font-serif text-base tracking-tight text-ink dark:text-bone group-hover:text-brass transition-colors duration-300 truncate">
                    {p.name}
                  </h2>
                </div>

                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-brass transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
