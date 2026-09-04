import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { TaxonomyCardImage } from '@/components/catalog/taxonomy-card-image';
import { getPerfumers } from '@/lib/catalog/perfumers';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';

type Props = { params: Promise<{ locale: Locale }> };

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export default async function PerfumersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('perfumers');
  const perfumers = await getPerfumers(locale);

  return (
    <main className="container space-y-10 py-12">
      <header className="max-w-2xl space-y-3">
        <p className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          {t('title')}
        </p>
        <h1 className="font-display text-ink dark:text-bone text-4xl md:text-6xl">{t('title')}</h1>
        <p className="text-ink-muted text-sm dark:text-stone-400">{t('subtitle')}</p>
      </header>
      {perfumers.length === 0 ? (
        <p className="py-16 text-center text-sm text-stone-500">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {perfumers.map((perfumer) => (
            <Link
              key={perfumer.slug}
              href={taxonomyHref('perfumer', locale, perfumer.slug)}
              className="group border-border/80 hover:border-foreground rounded-xl border p-5 transition hover:bg-stone-50 dark:hover:bg-[#1A1714]/60"
            >
              <TaxonomyCardImage
                src={perfumer.image}
                alt={perfumer.name}
                mode="cover"
                fallback={
                  <span
                    aria-hidden="true"
                    className="border-border text-muted-foreground flex h-2/3 w-2/3 items-center justify-center border font-mono text-3xl"
                  >
                    {initials(perfumer.name)}
                  </span>
                }
              />
              <h2 className="text-ink group- dark:text-bone font-serif text-base transition hover:underline hover:underline-offset-4">
                {perfumer.name}
              </h2>
              {perfumer.country && (
                <p className="mt-1 text-xs tracking-widest text-stone-500 uppercase">
                  {perfumer.country}
                </p>
              )}
              <p className="mt-3 text-xs text-stone-500">
                {t('productCount', { count: perfumer.product_count })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
