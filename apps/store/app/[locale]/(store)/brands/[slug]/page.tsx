import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { TaxonomyProductGrid } from '@/components/catalog/taxonomy-product-grid';
import { getBrand } from '@/lib/catalog/brands';
import { countryName } from '@/lib/catalog/countries';
import { listProducts } from '@/lib/catalog/products';
import { pageMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const loadBrand = cache(getBrand);

const pageNumber = (raw: string | string[] | undefined): number => {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) && n > 1 ? Math.floor(n) : 1;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = pageNumber((await searchParams).page);
  const brand = await loadBrand(slug, locale);
  if (!brand) return {};

  const t = await getTranslations({ locale, namespace: 'brands' });
  return pageMetadata({
    locale,
    path: `/brands/${brand.slug}${page > 1 ? `?page=${page}` : ''}`,
    title: t('metaTitle', { name: brand.name }),
    description:
      brand.description || t('metaDescription', { name: brand.name, count: brand.product_count }),
    images: brand.image ? [brand.image] : undefined,
  });
}

// A brand's own page. It used to redirect to /catalog?brand=…, so there was no
// URL a search for "Tom Ford Ташкент" could land on with the house's name in
// its title. The filtered catalogue still exists for narrowing further.
export default async function BrandDetailPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = pageNumber((await searchParams).page);

  const brand = await loadBrand(slug, locale);
  if (!brand) notFound();

  const [t, tc, { data, meta }] = await Promise.all([
    getTranslations('brands'),
    getTranslations('catalog'),
    listProducts({ locale, brand: brand.slug, sort: 'popular', page }),
  ]);

  const pageHref = (n: number) => `/${locale}/brands/${brand.slug}${n > 1 ? `?page=${n}` : ''}`;
  const facts = [
    brand.country ? countryName(brand.country, locale) : null,
    t('productCount', { count: meta.total }),
  ].filter(Boolean);

  return (
    <div className="container space-y-12 py-12 md:py-16">
      <header className="space-y-6">
        <Link
          href={`/${locale}/brands`}
          className="text-muted-foreground hover:text-foreground text-label font-mono tracking-[0.16em] uppercase"
        >
          ← {t('backToBrands')}
        </Link>

        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-6">
            {brand.image && (
              <div className="border-border relative hidden h-24 w-24 shrink-0 overflow-hidden border sm:block">
                <Image
                  src={brand.image}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-contain p-3 mix-blend-multiply dark:mix-blend-normal"
                />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-muted-foreground text-label font-mono tracking-[0.16em] uppercase">
                {facts.join(' · ')}
              </p>
              <h1 className="text-4xl font-semibold tracking-[-0.02em] md:text-6xl">
                {brand.name}
              </h1>
            </div>
          </div>

          <Link
            href={`/${locale}/catalog?brand=${encodeURIComponent(brand.slug)}`}
            className="border-border hover:border-foreground text-label self-start border px-4 py-2 font-mono tracking-[0.12em] uppercase md:self-auto"
          >
            {t('filterInCatalog')} →
          </Link>
        </div>

        {brand.description && (
          <p className="text-muted-foreground max-w-prose font-serif text-base leading-relaxed">
            {brand.description}
          </p>
        )}
      </header>

      <section className="border-border space-y-6 border-t pt-8">
        <h2 className="text-label font-mono tracking-[0.16em] uppercase">
          {t('detailProducts')}
        </h2>
        <TaxonomyProductGrid products={data} locale={locale} emptyLabel={t('emptyProducts')} />
      </section>

      {meta.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="border-border hover:border-foreground border px-4 py-2 text-xs tracking-wider uppercase"
            >
              {tc('prev')}
            </Link>
          ) : (
            <span className="border-border/50 text-ink-muted/50 border px-4 py-2 text-xs tracking-wider uppercase">
              {tc('prev')}
            </span>
          )}
          <span className="text-ink-muted text-xs tracking-wider uppercase dark:text-stone-400">
            {tc('pageOf', { page, total: meta.totalPages })}
          </span>
          {page < meta.totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="border-border hover:border-foreground border px-4 py-2 text-xs tracking-wider uppercase"
            >
              {tc('next')}
            </Link>
          ) : (
            <span className="border-border/50 text-ink-muted/50 border px-4 py-2 text-xs tracking-wider uppercase">
              {tc('next')}
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
