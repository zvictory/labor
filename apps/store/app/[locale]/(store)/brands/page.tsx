import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { TaxonomyCardImage } from '@/components/catalog/taxonomy-card-image';
import { BlockMarker, chunk, pad } from '@/components/catalog/index-block';
import { getBrands } from '@/lib/catalog/brands';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';

type Props = { params: Promise<{ locale: Locale }> };

// Blocks of twelve, ordered by how much of the catalogue each house actually
// holds. Alphabetical order gave a brand with one decant the same standing as
// one with eighty-four, which is not what a customer walking the shop sees.
const BLOCK_SIZE = 12;

export default async function BrandsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('brands');
  const brands = await getBrands(locale);
  const blocks = chunk(brands, BLOCK_SIZE);

  return (
    <main className="container space-y-10 py-12">
      <header className="max-w-2xl space-y-3">
        <p className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          {t('title')}
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.02em] md:text-6xl">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        <p className="text-muted-foreground text-label font-mono tracking-[0.16em] uppercase">
          {brands.length} houses
        </p>
      </header>

      {brands.length === 0 ? (
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
                  position={`${pad(first)}–${pad(last)} / ${brands.length}`}
                />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                  {block.map((brand) => (
                    <Link
                      key={brand.slug}
                      href={taxonomyHref('brand', locale, brand.slug)}
                      className="group border-border hover:border-foreground flex flex-col border transition-colors"
                    >
                      <div className="border-border border-b">
                        <TaxonomyCardImage
                          src={brand.image}
                          alt={brand.name}
                          mode="contain"
                          fallback={
                            // No logo file yet. The brand's own name set in the
                            // page's type is a truer stand-in than a bottle
                            // photograph, which would read as the product.
                            <span className="px-3 text-center text-sm font-semibold tracking-[-0.01em]">
                              {brand.name}
                            </span>
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1 p-3">
                        <p className="text-sm leading-tight font-semibold tracking-[-0.01em]">
                          {brand.name}
                        </p>
                        <span className="text-muted-foreground text-micro font-mono tracking-[0.12em] uppercase tabular-nums">
                          {brand.country ? `${brand.country} · ` : ''}
                          {t('productCount', { count: brand.product_count })}
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
