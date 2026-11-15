import { DirectorySearch } from '@/components/catalog/directory-search';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { TaxonomyCardImage } from '@/components/catalog/taxonomy-card-image';
import { chunk, pad } from '@/components/catalog/index-block';
import { getPerfumers } from '@/lib/catalog/perfumers';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';
import { pageMetadata } from '@/lib/seo';
import { countryName } from '@/lib/catalog/countries';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'perfumers' });
  return pageMetadata({
    locale,
    path: '/perfumers',
    title: t('title'),
    description: t('subtitle'),
  });
}

// Same twelve-block rhythm as the catalogue and the brand index, so the three
// indexes are one instrument rather than three walls of different heights.
const BLOCK_SIZE = 12;

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
  const tc = await getTranslations('common');
  const perfumers = await getPerfumers(locale);
  const blocks = chunk(perfumers, BLOCK_SIZE);

  return (
    <main className="container space-y-10 py-12">
      <header className="max-w-2xl space-y-3">
        <p className="eyebrow">{t('title')}</p>
        <h1 className="page-title">{t('title')}</h1>
        <p className="body-copy">{t('subtitle')}</p>
        <p className="text-muted-foreground text-label font-mono tracking-[0.16em] uppercase">
          {t('count', { count: perfumers.length })}
        </p>
      </header>
      {perfumers.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">{t('empty')}</p>
      ) : (
        <DirectorySearch
          locale={locale}
          groups={blocks.map((block, bi) => ({
            id: String(bi),
            label: tc('block', { n: pad(bi + 1) }),
            items: block.map((perfumer) => ({
              id: perfumer.slug,
              name: perfumer.name,
              content: (
                <Link
                  key={perfumer.slug}
                  href={taxonomyHref('perfumer', locale, perfumer.slug)}
                  className="group border-border hover:border-foreground flex flex-col border transition-colors"
                >
                  <div className="border-border border-b">
                    <TaxonomyCardImage
                      src={perfumer.image}
                      alt={perfumer.name}
                      mode="cover"
                      portrait
                      fallback={
                        <span
                          aria-hidden="true"
                          className="text-muted-foreground font-mono text-2xl"
                        >
                          {initials(perfumer.name)}
                        </span>
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <p className="text-sm leading-tight font-semibold tracking-[-0.01em]">
                      {perfumer.name}
                    </p>
                    <span className="text-muted-foreground text-micro font-mono tracking-[0.12em] uppercase tabular-nums">
                      {perfumer.country ? `${countryName(perfumer.country, locale)} · ` : ''}
                      {t('productCount', { count: perfumer.product_count })}
                    </span>
                  </div>
                </Link>
              ),
            })),
          }))}
        />
      )}
    </main>
  );
}
