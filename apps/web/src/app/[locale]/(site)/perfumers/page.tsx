import Image from 'next/image';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageIntro } from '@/components/page-intro';
import { getPerfumers, type PerfumerSummary } from '@/lib/api/perfumers';
import { PERFUMER_IMAGES } from './perfumer-image-manifest';

interface Props {
  params: Promise<{ locale: string }>;
}

type Lang = 'en' | 'ru' | 'uz';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

const EYEBROW: Record<Lang, string> = {
  ru: 'НОСЫ И МАСТЕРА',
  en: 'NOSES & MAKERS',
  uz: 'BURUN VA USTALAR',
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
    <div className="from-brass/30 via-brass/15 to-brass/5 dark:from-brass/20 dark:via-brass/10 flex h-full w-full items-center justify-center bg-gradient-to-br dark:to-transparent">
      <span className="text-brass font-serif text-3xl font-medium tracking-wider">
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
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-4 md:py-6">
      <PageIntro eyebrow={EYEBROW[lang]} title={t('title')} lead={t('subtitle')} />

      {loadError ? (
        <p className="text-ink-muted text-center text-sm dark:text-stone-400">
          {t('errorLoading')}
        </p>
      ) : perfumers.length === 0 ? (
        <p className="text-ink-muted text-center text-sm dark:text-stone-400">{t('empty')}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {perfumers.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/${locale}/perfumers/${p.slug}`}
                className="group bg-bone border-border/80 hover:border-brass/70 relative flex flex-col overflow-hidden rounded-xl border transition-all duration-500 hover:bg-stone-50 hover:shadow-xl dark:bg-[#1A1714]/30 dark:hover:bg-[#1A1714]/60"
              >
                {/* Product count chip — top-right circle, brass-on-bone */}
                <span
                  aria-label={t('productCount', { count: p.product_count })}
                  className="bg-brass text-bone ring-bone absolute top-2 right-2 z-10 inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-2 font-mono text-[11px] font-bold tracking-tight tabular-nums shadow-md ring-2 dark:ring-[#1A1714]"
                >
                  {p.product_count}
                </span>

                <div className="border-border/60 relative aspect-square w-full overflow-hidden border-b">
                  <PerfumerAvatar slug={p.slug} name={p.name} />
                  {p.country && (
                    <span className="bg-bone/90 absolute top-2 left-2 rounded px-2 py-0.5 font-mono text-[8px] font-semibold tracking-[0.2em] text-stone-500 uppercase backdrop-blur-sm dark:bg-[#1A1714]/80 dark:text-stone-400">
                      {p.country}
                    </span>
                  )}
                </div>

                <div className="min-w-0 p-4">
                  <h2 className="text-ink dark:text-bone group-hover:text-brass truncate font-serif text-base tracking-tight transition-colors duration-300">
                    {p.name}
                  </h2>
                </div>

                <div className="bg-brass absolute inset-x-0 bottom-0 h-[2px] scale-x-0 transform transition-transform duration-500 group-hover:scale-x-100" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
