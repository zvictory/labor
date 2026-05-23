'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import { useCompareStore } from '@/lib/stores/compare-store';
import { getProduct, type Product } from '@/lib/api/products';
import { formatRating, formatUzs } from '@/lib/format';

export const CompareView = () => {
  const t = useTranslations('compare.page');
  const locale = useLocale();
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);

  const queries = useQueries({
    queries: items.map((i) => ({
      queryKey: ['compare', 'product', i.slug, locale] as const,
      queryFn: () => getProduct(i.slug, locale).then((r) => r.data),
      staleTime: 5 * 60_000,
    })),
  });

  const detailsById = new Map<number, Product>();
  for (let idx = 0; idx < items.length; idx++) {
    const q = queries[idx];
    if (q?.data) detailsById.set(items[idx]!.id, q.data);
  }

  const anyError = queries.some((q) => q.isError);
  const allLoading = queries.length > 0 && queries.every((q) => q.isLoading);

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-serif text-3xl">{t('empty.title')}</h1>
        <p className="mt-2 text-stone-600">{t('empty.body')}</p>
        <Link
          href={`/${locale}/catalog`}
          className="mt-6 inline-block rounded-full bg-stone-900 px-6 py-3 text-sm uppercase tracking-widest text-white"
        >
          {t('empty.cta')}
        </Link>
      </main>
    );
  }

  const rows: Array<{ key: string; label: string; render: (p: Product) => React.ReactNode }> = [
    { key: 'brand',     label: t('rows.brand'),     render: (p) => p.brand.name },
    { key: 'gender',    label: t('rows.gender'),    render: (p) => p.gender },
    { key: 'conc',      label: t('rows.conc'),      render: (p) => p.concentration.toUpperCase() },
    { key: 'volume',    label: t('rows.volume'),    render: (p) => `${p.volume_ml} ml` },
    { key: 'price',     label: t('rows.price'),     render: (p) => formatUzs(p.price, locale) },
    { key: 'rating',    label: t('rows.rating'),    render: (p) => `${formatRating(p.fragrance.avg_rating)} (${p.fragrance.votes_count})` },
    { key: 'longevity', label: t('rows.longevity'), render: (p) => `${formatRating(p.fragrance.avg_longevity)}/5` },
    { key: 'sillage',   label: t('rows.sillage'),   render: (p) => `${formatRating(p.fragrance.avg_sillage)}/5` },
    { key: 'top',       label: t('rows.topNotes'),  render: (p) => p.fragrance.notes.filter((n) => n.layer === 'top').map((n) => n.name).join(', ') || '—' },
    { key: 'heart',     label: t('rows.heart'),     render: (p) => p.fragrance.notes.filter((n) => n.layer === 'heart').map((n) => n.name).join(', ') || '—' },
    { key: 'base',      label: t('rows.base'),      render: (p) => p.fragrance.notes.filter((n) => n.layer === 'base').map((n) => n.name).join(', ') || '—' },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-serif text-3xl tracking-tight mb-6">{t('title')}</h1>

      {anyError && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {t('errorLoading')}
        </div>
      )}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `200px repeat(${items.length}, minmax(180px, 1fr))` }}
      >
        <div />
        {items.map((p) => (
          <div key={p.id} className="space-y-2">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-50">
              <Image src={p.image} alt={p.name} fill sizes="200px" className="object-cover" />
              <button
                onClick={() => remove(p.id)}
                aria-label={t('remove')}
                className="absolute right-1 top-1 rounded-full bg-white/90 px-2 text-xs"
              >
                ✕
              </button>
            </div>
            <Link href={`/${locale}/product/${p.slug}`} className="block text-sm hover:underline">
              {p.name}
            </Link>
          </div>
        ))}

        {rows.map((row) => (
          <Fragment key={row.key}>
            <div className="border-t border-stone-200 py-3 text-xs uppercase tracking-widest text-stone-500">
              {row.label}
            </div>
            {items.map((p) => {
              const d = detailsById.get(p.id);
              return (
                <div
                  key={`${row.key}-${p.id}`}
                  className="border-t border-stone-200 py-3 text-sm text-stone-800"
                >
                  {d ? row.render(d) : allLoading ? '…' : '—'}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </main>
  );
};
