'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { getOrder, type OrderDetail } from '@/lib/api/account';
import { formatUzs } from '@/lib/format';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'no-token' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; order: OrderDetail };

interface PageProps {
  params: Promise<{ locale: string; number: string }>;
}

export default function AccountOrderDetailPage({ params }: PageProps) {
  const { number } = use(params);
  const t = useTranslations('account');
  const locale = useLocale();
  const [state, setState] = useState<LoadState>({ kind: 'idle' });

  useEffect(() => {
    const token = localStorage.getItem('labor-token');
    if (!token) {
      setState({ kind: 'no-token' });
      return;
    }
    setState({ kind: 'loading' });
    getOrder(number, locale, token)
      .then((order) => setState({ kind: 'ready', order }))
      .catch((e: Error) => setState({ kind: 'error', message: e.message }));
  }, [locale, number]);

  if (state.kind === 'idle' || state.kind === 'loading') {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
        <div className="h-32 animate-pulse rounded-lg bg-neutral-50" />
      </div>
    );
  }

  if (state.kind === 'no-token') {
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

  if (state.kind === 'error') {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <h1 className="mb-4 font-serif text-3xl">{t('detailTitle')}</h1>
        <p className="text-sm text-red-600">{t('error')}</p>
      </div>
    );
  }

  const { order } = state;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl">
          {t('orderNumber')} #{order.number}
        </h1>
        <div className="flex items-baseline gap-3 text-sm text-neutral-600">
          <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs uppercase tracking-widest">
            {order.state}
          </span>
          <span>{order.completed_at ? format(new Date(order.completed_at), 'dd.MM.yyyy') : '—'}</span>
          <span className="ml-auto font-medium text-neutral-900">
            {formatUzs(order.total, locale)}
          </span>
        </div>
      </header>

      <section className="rounded-lg border border-neutral-200 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-neutral-600">
          {t('detailLineItems')}
        </h2>
        <ul className="divide-y divide-neutral-100">
          {order.line_items.map((li, idx) => (
            <li key={`${li.slug}-${idx}`} className="flex items-center gap-3 py-3">
              {li.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={li.image}
                  alt={li.name}
                  className="h-14 w-14 rounded object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded bg-neutral-100" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{li.name}</div>
                <div className="text-xs text-neutral-500">× {li.quantity}</div>
              </div>
              <div className="text-sm font-medium">{formatUzs(li.line_total, locale)}</div>
            </li>
          ))}
        </ul>
      </section>

      {order.ship_address ? (
        <section className="rounded-lg border border-neutral-200 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-neutral-600">
            {t('detailShipping')}
          </h2>
          <div className="text-sm leading-relaxed text-neutral-700">
            <div>{order.ship_address.name}</div>
            <div>{order.ship_address.phone}</div>
            <div>
              {order.ship_address.city}, {order.ship_address.address1}
              {order.ship_address.address2 ? `, ${order.ship_address.address2}` : ''}
            </div>
            {order.ship_address.zipcode ? <div>{order.ship_address.zipcode}</div> : null}
          </div>
        </section>
      ) : null}

      {order.shipments.length > 0 ? (
        <section className="rounded-lg border border-neutral-200 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-neutral-600">
            {t('detailShipmentTracking')}
          </h2>
          <ul className="space-y-1 text-sm text-neutral-700">
            {order.shipments.map((s, i) => (
              <li key={i} className="flex justify-between">
                <span className="uppercase tracking-wide text-neutral-500">{s.state}</span>
                <span className="font-mono text-xs">{s.tracking ?? t('detailNoTracking')}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {order.payments.length > 0 ? (
        <section className="rounded-lg border border-neutral-200 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-neutral-600">
            {t('detailPayments')}
          </h2>
          <ul className="space-y-1 text-sm text-neutral-700">
            {order.payments.map((p, i) => (
              <li key={i} className="flex justify-between">
                <span>{p.method}</span>
                <span className="uppercase tracking-wide text-neutral-500">{p.state}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
