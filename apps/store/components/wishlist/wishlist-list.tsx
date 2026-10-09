'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { ProductCardDTO } from '@/lib/catalog/types';
import { ProductCard } from '@/components/catalog/product-card';
import { useWishlist } from '@/components/wishlist/wishlist-store';

// The /wishlist page body. The list of ids is known only in the browser for a
// guest, so the cards are fetched from here rather than rendered on the server.
// Unsaving a product from its card removes it from the grid straight away.
export function WishlistList({ locale }: { locale: string }) {
  const t = useTranslations('wishlist');
  const { ready, ids } = useWishlist();
  const [products, setProducts] = useState<ProductCardDTO[] | null>(null);
  const key = ids.join(',');
  // Fetch when a saved id has no card yet. Removing one needs no request: the
  // grid below filters by the current ids.
  const missing =
    ready && (products === null || ids.some((id) => !products.some((p) => p.id === id)));

  useEffect(() => {
    if (!missing) return;
    if (key === '') {
      setProducts([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/wishlist/products?locale=${locale}&ids=${key}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: ProductCardDTO[] }) => {
        if (!cancelled) setProducts(data.products);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [missing, key, locale]);

  if (!ready || products === null) {
    return <p className="text-muted-foreground py-16 text-center text-sm">{t('loading')}</p>;
  }

  const shown = products.filter((p) => ids.includes(p.id));
  if (shown.length === 0) {
    return (
      <div className="space-y-6 py-16 text-center">
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
        <Link
          href={`/${locale}/catalog`}
          className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-12 items-center justify-center px-7 text-xs font-semibold tracking-widest uppercase transition-colors"
        >
          {t('browse')}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {shown.map((product) => (
        <ProductCard key={product.id} product={product} locale={locale} />
      ))}
    </div>
  );
}
