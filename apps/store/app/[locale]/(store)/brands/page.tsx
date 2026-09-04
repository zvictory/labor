import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { TaxonomyCardImage } from '@/components/catalog/taxonomy-card-image';
import { getBrands } from '@/lib/catalog/brands';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';

type Props = { params: Promise<{ locale: Locale }> };

export default async function BrandsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('brands');
  const brands = await getBrands(locale);

  return (
    <main className="container space-y-10 py-12">
      <header className="max-w-2xl space-y-3">
        <p className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          {t('title')}
        </p>
        <h1 className="font-display text-ink dark:text-bone text-4xl md:text-6xl">{t('title')}</h1>
        <p className="text-ink-muted text-sm dark:text-stone-400">{t('subtitle')}</p>
      </header>
      {brands.length === 0 ? (
        <p className="py-16 text-center text-sm text-stone-500">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={taxonomyHref('brand', locale, brand.slug)}
              className="group border-border/80 hover:border-foreground flex min-h-40 flex-col justify-between rounded-xl border p-5 transition hover:bg-stone-50 dark:hover:bg-[#1A1714]/60"
            >
              <TaxonomyCardImage
                src={brand.image}
                alt={brand.name}
                mode="contain"
                fallback={
                  <span className="text-brass font-display text-3xl" aria-hidden>
                    {brand.name.slice(0, 1)}
                  </span>
                }
              />
              <div>
                <p className="text-ink group- dark:text-bone font-serif text-lg transition hover:underline hover:underline-offset-4">
                  {brand.name}
                </p>
                {brand.country && (
                  <p className="mt-1 text-xs tracking-widest text-stone-500 uppercase">
                    {brand.country}
                  </p>
                )}
              </div>
              <p className="text-xs text-stone-500">
                {t('productCount', { count: brand.product_count })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
