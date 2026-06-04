'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useWishlistStore } from '@/lib/stores/wishlist-store';
import { ProductCard } from '@/components/catalog/product-card';
import { apiFetch } from '@/lib/api/client';
import type { ProductCard as Card } from '@/lib/api/products';

export default function WishlistPage() {
  const t = useTranslations('wishlist');
  const locale = useLocale();
  const ids = useWishlistStore((s) => s.ids);
  const clear = useWishlistStore((s) => s.clear);
  const [items, setItems] = useState<Card[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) { setItems([]); return; }
    apiFetch<{ data: Card[] }>(`/storefront/products?filter[ids]=${ids.join(',')}`, { locale })
      .then((r) => { if (!cancelled) setItems(r.data); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [ids, locale]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 space-y-8">
      <header className="flex items-baseline justify-between">
        <h1 className="font-serif text-4xl tracking-tight">{t('title')}</h1>
        {ids.length > 0 && (
          <button onClick={clear} className="text-sm text-stone-500 hover:text-stone-900">{t('clear')}</button>
        )}
      </header>

      {items === null && <p className="text-stone-600">{t('loading')}</p>}
      {items?.length === 0 && (
        <div className="space-y-3">
          <p className="text-stone-600">{t('empty')}</p>
          <Link href={`/${locale}/catalog`} className="inline-block rounded-full bg-stone-900 px-6 py-3 text-sm uppercase tracking-widest text-white">
            {t('browse')}
          </Link>
        </div>
      )}
      {items && items.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} product={p} locale={locale} />)}
        </div>
      )}
    </main>
  );
}
