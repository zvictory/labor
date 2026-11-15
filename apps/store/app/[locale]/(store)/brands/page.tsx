import { LaborLogo } from '@/components/brand/labor-logo';
import { DirectorySearch } from '@/components/catalog/directory-search';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { getBrands } from '@/lib/catalog/brands';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'brands' });
  return pageMetadata({ locale, path: '/brands', title: t('title'), description: t('subtitle') });
}

export default async function BrandsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('brands');
  const brands = await getBrands(locale);

  return (
    <main className="container space-y-10 py-10 md:space-y-14 md:py-16">
      <header className="max-w-2xl space-y-3">
        <h1 className="page-title">{t('title')}</h1>
        <p className="body-copy">{t('subtitle')}</p>
      </header>

      {brands.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">{t('empty')}</p>
      ) : (
        <DirectorySearch
          locale={locale}
          variant="minimal"
          groups={[
            {
              id: 'brands',
              label: t('title'),
              items: brands.map((brand) => ({
                id: brand.slug,
                name: brand.name,
                content: (
                  <Link
                    href={taxonomyHref('brand', locale, brand.slug)}
                    aria-label={`${brand.name} — ${t('productCount', { count: brand.product_count })}`}
                    className="flex h-full flex-col items-center py-4 text-center hover:opacity-75 focus-visible:outline-offset-4 motion-safe:transition-opacity motion-safe:duration-150"
                  >
                    <div className="relative flex h-28 w-full items-center justify-center md:h-36">
                      <span
                        aria-hidden="true"
                        className="bg-muted text-muted-foreground absolute top-1 right-1 z-10 flex h-8 w-8 items-center justify-center rounded-[50%] text-xs leading-none tabular-nums md:top-3 md:right-3"
                      >
                        {brand.product_count}
                      </span>
                      {brand.slug === 'labor' ? (
                        <LaborLogo className="max-w-[70%]" />
                      ) : brand.image ? (
                        <Image
                          src={brand.image}
                          alt=""
                          fill
                          sizes="(min-width:1024px) 240px, (min-width:640px) 28vw, 42vw"
                          className="object-contain px-5 py-7 mix-blend-multiply md:px-8 md:py-9 dark:mix-blend-normal"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="px-3 text-lg font-medium tracking-tight md:text-2xl"
                        >
                          {brand.name}
                        </span>
                      )}
                    </div>
                  </Link>
                ),
              })),
            },
          ]}
        />
      )}
    </main>
  );
}
