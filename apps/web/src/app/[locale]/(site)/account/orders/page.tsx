'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '@/lib/api/account';
import { formatUzs } from '@/lib/format';

export default function AccountOrdersPage() {
  const t = useTranslations('account');
  const locale = useLocale();

  // localStorage is client-only; defer read until after mount so the query
  // key is stable and SSR doesn't try to evaluate it.
  const [token, setToken] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem('labor-token'));
    setTokenChecked(true);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['account', 'orders', locale, token] as const,
    queryFn: () => {
      if (!token) throw new Error('missing token');
      return getOrders(locale, token);
    },
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  if (!tokenChecked || (token && isLoading)) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 py-10">
        <h1 className="font-serif text-3xl">{t('ordersTitle')}</h1>
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-20 animate-pulse rounded-lg border border-neutral-200 bg-neutral-50"
            />
          ))}
        </ul>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="mb-4 text-sm text-neutral-600">{t('login')}</p>
        <Link
          href={`/${locale}/auth/telegram`}
          className="inline-block rounded-md border border-neutral-900 px-4 py-2 text-sm font-medium"
        >
          {t('loggingIn')}
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl py-10" role="alert">
        <h1 className="mb-4 font-serif text-3xl">{t('ordersTitle')}</h1>
        <p className="text-sm text-red-600">{t('error')}</p>
      </div>
    );
  }

  const orders = data ?? [];

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="mb-4 text-sm text-neutral-600">{t('empty')}</p>
        <Link
          href={`/${locale}/catalog`}
          className="inline-block rounded-md border border-neutral-900 px-4 py-2 text-sm font-medium"
        >
          {t('emptyCta')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 py-10">
      <h1 className="font-serif text-3xl">{t('ordersTitle')}</h1>
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.number}>
            <Link
              href={`/${locale}/account/orders/${encodeURIComponent(o.number)}`}
              className="block rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-medium">
                  {t('orderNumber')} #{o.number}
                </span>
                <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs uppercase tracking-widest text-neutral-600">
                  {o.state}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between text-sm text-neutral-600">
                <span>
                  {o.completed_at ? format(new Date(o.completed_at), 'dd.MM.yyyy') : '—'}
                </span>
                <span className="font-medium text-neutral-900">{formatUzs(o.total, locale)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
