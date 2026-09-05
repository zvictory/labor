import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { TaxonomyCardImage } from '@/components/catalog/taxonomy-card-image';
import { BlockMarker, chunk, pad } from '@/components/catalog/index-block';
import { getPerfumers } from '@/lib/catalog/perfumers';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';

type Props = { params: Promise<{ locale: Locale }> };

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
  const perfumers = await getPerfumers(locale);
  const blocks = chunk(perfumers, BLOCK_SIZE);

  return (
    <main className="container space-y-10 py-12">
      <header className="max-w-2xl space-y-3">
        <p className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          {t('title')}
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.02em] md:text-6xl">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        <p className="text-muted-foreground text-label font-mono tracking-[0.16em] uppercase">
          {perfumers.length} noses
        </p>
      </header>
      {perfumers.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">{t('empty')}</p>
      ) : (
        <div className="space-y-12">
          {blocks.map((block, bi) => {
            const first = bi * BLOCK_SIZE + 1;
            const last = first + block.length - 1;
            return (
              <section key={first} className="space-y-5">
                <BlockMarker
                  label={`Block ${pad(bi + 1)}`}
                  position={`${pad(first)}–${pad(last)} / ${perfumers.length}`}
                />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                  {block.map((perfumer) => (
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
                          {perfumer.country ? `${perfumer.country} · ` : ''}
                          {t('productCount', { count: perfumer.product_count })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
