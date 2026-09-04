// Admin order detail. Server component: guarded by requireStaff(), loads the full
// AdminOrderDetail (line items, payments, shipping snapshot), and mounts the
// client action bar (OrderStatusActions) which only offers legal transitions. ru-
// primary labels. Money via formatUzs (integer so'm).

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireStaff } from '@/lib/admin/guard';
import { formatUzs } from '@/lib/money';
import { getAdminOrder } from '@/lib/admin/order-queries';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/admin/orders/status-badge';
import { OrderStatusActions } from '@/components/admin/orders/order-status-actions';
import type { AdminOrderStatus } from '@/lib/admin/order-transitions';

type Props = {
  params: Promise<{ locale: string; number: string }>;
};

const PAYMENT_STATE_LABEL: Record<string, string> = {
  created: 'Создан',
  authorized: 'Авторизован',
  paid: 'Оплачен',
  canceled: 'Отменён',
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function AdminOrderDetailPage({ params }: Props) {
  await requireStaff();
  const { locale, number } = await params;

  const order = await getAdminOrder(number, locale);
  if (!order) notFound();

  const sectionTitleCls = 'text-muted-foreground font-mono text-micro tracking-[0.28em] uppercase';

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/${locale}/admin/orders`}
            className="text-ink-muted hover:text-foreground text-xs underline-offset-4 hover:underline dark:text-stone-400"
          >
            ← Все заказы
          </Link>
          <h1 className="font-display text-ink dark:text-bone text-3xl">{order.number}</h1>
          <p className="text-ink-muted text-sm dark:text-stone-400">
            {formatDate(order.createdAt)}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </div>
      </header>

      {/* Action bar */}
      <section className="border-border bg-background rounded-xl border p-5">
        <h2 className={sectionTitleCls}>Действия</h2>
        <div className="mt-4">
          <OrderStatusActions number={order.number} status={order.status as AdminOrderStatus} />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Items + totals */}
        <section className="space-y-4 lg:col-span-2">
          <h2 className={sectionTitleCls}>Товары</h2>
          <ul className="divide-border border-border divide-y rounded-xl border">
            {order.items.map((it) => (
              <li
                key={`${it.productId}-${it.isSample ? 'sample' : 'full'}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span className="text-ink dark:text-bone">
                  <Link
                    href={`/${locale}/product/${it.slug}`}
                    className="hover:underline hover:underline-offset-4"
                  >
                    {it.name}
                  </Link>
                  {it.isSample ? ' · пробник' : ''}
                  <span className="text-ink-muted dark:text-stone-400"> × {it.quantity}</span>
                  <span className="text-ink-muted block text-xs dark:text-stone-400">
                    {formatUzs(it.unitPrice, locale)} / шт
                  </span>
                </span>
                <span className="text-ink dark:text-bone font-medium whitespace-nowrap">
                  {formatUzs(it.lineTotal, locale)}
                </span>
              </li>
            ))}
          </ul>

          <div className="border-border dark:bg-ink/30 space-y-2 rounded-xl border bg-stone-50/50 p-5">
            <Row label="Сумма" value={formatUzs(order.subtotal, locale)} />
            <Row
              label={`Доставка${order.deliveryMethodLabel ? ` · ${order.deliveryMethodLabel}` : ''}`}
              value={order.deliveryFee > 0 ? formatUzs(order.deliveryFee, locale) : 'Бесплатно'}
            />
            <div className="border-border text-ink dark:text-bone flex items-center justify-between border-t pt-3 text-lg font-medium">
              <span>Итого</span>
              <span>{formatUzs(order.total, locale)}</span>
            </div>
          </div>
        </section>

        {/* Customer + payments */}
        <aside className="space-y-8">
          <section className="space-y-2">
            <h2 className={sectionTitleCls}>Клиент</h2>
            <div className="border-border rounded-xl border p-4 text-sm">
              {order.customerName && (
                <p className="text-ink dark:text-bone font-medium">{order.customerName}</p>
              )}
              {order.phone && <p className="text-ink-muted dark:text-stone-400">{order.phone}</p>}
              <p className="text-ink dark:text-bone mt-2">
                {[order.region, order.district, order.address].filter(Boolean).join(', ') || '—'}
              </p>
              {order.deliveryMethodLabel && (
                <p className="text-ink-muted mt-1 text-xs dark:text-stone-400">
                  {order.deliveryMethodLabel}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className={sectionTitleCls}>Платежи</h2>
            {order.payments.length === 0 ? (
              <p className="text-ink-muted text-sm dark:text-stone-400">Платежей нет.</p>
            ) : (
              <ul className="space-y-2">
                {order.payments.map((p, i) => (
                  <li
                    key={`${p.provider}-${p.externalTxnId ?? i}`}
                    className="border-border rounded-xl border p-4 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-ink dark:text-bone font-medium uppercase">
                        {p.provider}
                      </span>
                      <span className="text-ink-muted dark:text-stone-400">
                        {PAYMENT_STATE_LABEL[p.state] ?? p.state}
                      </span>
                    </div>
                    <p className="text-ink dark:text-bone mt-1">{formatUzs(p.amount, locale)}</p>
                    {p.externalTxnId && (
                      <p className="text-ink-muted mt-1 text-xs break-all dark:text-stone-400">
                        txn: {p.externalTxnId}
                      </p>
                    )}
                    <p className="text-ink-muted mt-1 text-xs dark:text-stone-400">
                      {formatDate(p.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-ink-muted flex items-center justify-between text-sm dark:text-stone-400">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
