'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { ProductCard } from '@/components/catalog/product-card';
import { searchProducts, type SearchProductsResult } from '@/lib/api/search';
import { ApiError } from '@/lib/api/client';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

const EMPTY_RESULT: SearchProductsResult = { items: [], totalCount: 0, totalPages: 0 };

export default function SearchPage() {
  const t = useTranslations('search');
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = useMemo(() => {
    const l = params?.locale;
    if (typeof l === 'string') return l;
    if (Array.isArray(l) && typeof l[0] === 'string') return l[0];
    return 'ru';
  }, [params]);

  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState<string>(initialQuery);
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);

  // Reflect query into URL (replace so back/forward stays usable)
  useEffect(() => {
    const sp = new URLSearchParams();
    if (debouncedQuery) sp.set('q', debouncedQuery);
    const qs = sp.toString();
    const next = qs ? `/${locale}/search?${qs}` : `/${locale}/search`;
    router.replace(next, { scroll: false });
  }, [debouncedQuery, locale, router]);

  const enabled = debouncedQuery.length >= MIN_QUERY_LEN;

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['search', 'products', debouncedQuery, locale] as const,
    queryFn: ({ signal }) => searchProducts(debouncedQuery, locale, { signal }),
    enabled,
    staleTime: 30_000,
  });

  const result = data ?? EMPTY_RESULT;
  const errorMsg =
    error instanceof ApiError ? error.message : error instanceof Error ? error.message : '';

  const isIdle = !enabled;
  const showLoading = enabled && (isLoading || isFetching) && !data;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 md:py-16 space-y-10">
      <header className="space-y-4">
        <span className="text-[10px] uppercase tracking-[0.3em] text-brass font-bold">
          {t('title')}
        </span>
        <h1 className="font-sans font-bold text-4xl md:text-5xl tracking-tight text-ink dark:text-bone">
          {t('title')}
        </h1>
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('placeholder')}
            autoFocus
            aria-label={t('placeholder')}
            className="w-full h-14 pl-12 pr-4 border border-border bg-background text-base text-ink dark:text-bone placeholder:text-stone-400 focus:outline-none focus:border-brass transition-colors"
          />
        </div>
        {enabled && !isError && !showLoading && (
          <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {t('resultsCount', { count: result.totalCount })}
          </p>
        )}
      </header>

      {isIdle && (
        <div className="py-20 text-center">
          <p className="text-stone-500 font-sans">{t('idle')}</p>
        </div>
      )}

      {showLoading && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="aspect-[3/4] rounded-lg bg-stone-100 dark:bg-stone-800" />
              <div className="h-3 w-1/3 bg-stone-100 dark:bg-stone-800 rounded" />
              <div className="h-4 w-2/3 bg-stone-100 dark:bg-stone-800 rounded" />
              <div className="h-3 w-1/2 bg-stone-100 dark:bg-stone-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="py-20 text-center space-y-2" role="alert">
          <p className="text-stone-500 font-sans">{t('errorLoading')}</p>
          {errorMsg && <p className="text-xs text-stone-400">{errorMsg}</p>}
        </div>
      )}

      {enabled && !isError && !showLoading && result.items.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-stone-500 font-sans">{t('empty', { query: debouncedQuery })}</p>
        </div>
      )}

      {enabled && !isError && result.items.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {result.items.map((p) => (
            <ProductCard key={p.id} product={p} locale={locale} />
          ))}
        </div>
      )}
    </main>
  );
}
