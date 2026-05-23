'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api/client';
import { formatUzs } from '@/lib/format';

interface Order {
  number: string;
  state: string;
  payment_state: string;
  shipment_state: string;
  total: number;
  created_at: string;
}

export default function TgOrdersPage() {
  const t = useTranslations('tg.orders');
  const locale = useLocale();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('labor-token') ?? undefined : undefined;
    apiFetch<{ data: Order[] }>('/storefront/account/orders', { locale, token })
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]));
  }, [locale]);

  if (orders === null) return <p className="py-12 text-center text-sm text-[var(--tg-hint-color)]">{t('loading')}</p>;
  if (orders.length === 0) return <p className="py-12 text-center text-sm text-[var(--tg-hint-color)]">{t('empty')}</p>;

  return (
    <div className="space-y-3">
      <h1 className="font-serif text-2xl">{t('title')}</h1>
      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o.number} className="rounded-lg border border-[var(--tg-hint-color)]/15 p-3 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">#{o.number}</span>
              <span className="text-xs uppercase tracking-widest text-[var(--tg-hint-color)]">{t(`state.${o.state}`)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-xs text-[var(--tg-hint-color)]">
              <span>{new Date(o.created_at).toLocaleDateString(locale)}</span>
              <span className="font-medium text-[var(--tg-text-color)]">{formatUzs(o.total, locale)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
