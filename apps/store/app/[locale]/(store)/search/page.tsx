import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SearchForm } from './search-form';
import { listProducts } from '@/lib/catalog/products';
import { ProductCard } from '@/components/catalog/product-card';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const q = first(sp.q);

  const t = await getTranslations('search');

  let products: any[] = [];
  let showResults = false;

  if (q && q.trim()) {
    const searchResult = await listProducts({
      locale,
      q: q.trim(),
      page: 1,
    });
    products = searchResult.data;
    showResults = true;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-12 space-y-8">
      <div className="flex flex-col items-center space-y-6 text-center">
        <h1 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
          {t('title')}
        </h1>
        <SearchForm placeholder={t('placeholder')} initialValue={q} />
      </div>

      <div className="pt-4">
        {!showResults ? (
          <div className="py-20 text-center">
            <p className="text-stone-500 font-sans">{t('idle')}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center animate-in fade-in duration-300">
            <p className="text-stone-500 font-sans">
              {t('empty', { query: q ?? '' })}
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <span className="text-xs uppercase tracking-widest text-stone-400">
                {t('resultsCount', { count: products.length })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} locale={locale} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
