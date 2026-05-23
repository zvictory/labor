import { notFound } from 'next/navigation';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
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
    <main className="mx-auto max-w-6xl px-6 py-16 space-y-12">
      <header className="space-y-4 text-center max-w-2xl mx-auto py-8">
        <Link
          href={`/${locale}/brands`}
          className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-brass font-bold block hover:opacity-70 transition-opacity"
        >
          {t('viewAll')}
        </Link>
        <h1 className="font-sans font-bold text-4xl md:text-5xl tracking-tight text-ink dark:text-bone">
          {brand.name}
        </h1>
        {brand.origin && (
          <span className="inline-block text-[10px] font-mono tracking-[0.3em] text-stone-500 dark:text-stone-400 uppercase font-semibold">
            {brand.origin}
          </span>
        )}
        <div className="h-[1px] w-12 bg-brass mx-auto my-6 opacity-60" />
        {brand.description && (
          <p className="text-sm font-sans leading-relaxed text-ink-muted dark:text-stone-400">
            {brand.description}
          </p>
        )}
      </header>

      <section className="space-y-6">
        <h2 className="text-xs uppercase tracking-[0.3em] text-ink-muted dark:text-stone-400 font-semibold">
          {t('detailProducts')}
        </h2>
        {brand.products.length === 0 ? (
          <p className="text-sm text-ink-muted dark:text-stone-400">{t('empty')}</p>
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
