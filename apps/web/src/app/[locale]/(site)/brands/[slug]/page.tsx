import { notFound } from 'next/navigation';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageIntro } from '@/components/page-intro';
import { ApiError } from '@/lib/api/client';
import { getBrand, type BrandDetail } from '@/lib/api/brands';
import { ProductCard } from '@/components/catalog/product-card';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function BrandDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('brands');

  let brand: BrandDetail;
  try {
    brand = await getBrand(slug, locale);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-4 md:py-6">
      <PageIntro
        eyebrow={
          <Link href={`/${locale}/brands`} className="hover:opacity-70">
            {t('viewAll')}
          </Link>
        }
        title={brand.name}
        lead={brand.description}
        action={
          brand.origin ? (
            <span className="text-ink-muted inline-block font-mono text-[10px] font-semibold tracking-[0.3em] uppercase dark:text-stone-400">
              {brand.origin}
            </span>
          ) : null
        }
      />

      <section className="space-y-6">
        <h2 className="text-ink-muted text-xs font-semibold tracking-[0.3em] uppercase dark:text-stone-400">
          {t('detailProducts')}
        </h2>
        {brand.products.length === 0 ? (
          <p className="text-ink-muted text-sm dark:text-stone-400">{t('empty')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {brand.products.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
