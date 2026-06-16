import Link from 'next/link';

import { requireStaff } from '@/lib/admin/guard';
import { getAdminMetrics, ORDER_STATUSES } from '@/lib/admin/metrics';
import { formatUzs } from '@/lib/money';
import { StatCard } from '@/components/admin/stat-card';

// Admin dashboard. The layout already guarded the subtree, but we call requireStaff()
// here too so this page is safe in isolation (and to reach the locale for links).
// Thin by design: all aggregation lives in getAdminMetrics().

type Props = { params: Promise<{ locale: string }> };

const STATUS_LABELS: Record<string, string> = {
  pending: 'Новые',
  confirmed: 'Подтверждены',
  paid: 'Оплачены',
  shipped: 'Отправлены',
  delivered: 'Доставлены',
  canceled: 'Отменены',
};

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  await requireStaff();

  const { counts, ordersByStatus, recentOrders } = await getAdminMetrics();
  const adminBase = `/${locale}/admin`;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">Обзор</h1>
        <p className="mt-2 text-sm text-ink-muted dark:text-stone-400">
          Сводка по каталогу и заказам Labor Parfum.
        </p>
      </header>

      {/* KPI grid */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Товары" value={counts.products} href={`${adminBase}/catalog`} />
        <StatCard label="Заказы" value={counts.orders} href={`${adminBase}/orders`} />
        <StatCard label="Кампании" value={counts.campaigns} href={`${adminBase}/campaigns`} />
        <StatCard label="Бренды" value={counts.brands} />
        <StatCard label="Ноты" value={counts.notes} />
        <StatCard label="Пользователи" value={counts.users} />
      </section>

      {/* Orders by status */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
          Заказы по статусу
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ORDER_STATUSES.map((status) => (
            <div
              key={status}
              className="rounded-lg border border-border bg-background px-4 py-3"
            >
              <p className="text-xs text-ink-muted dark:text-stone-400">
                {STATUS_LABELS[status] ?? status}
              </p>
              <p className="mt-1 font-display text-2xl text-ink dark:text-bone">
                {ordersByStatus[status]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent orders */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
            Последние заказы
          </h2>
          <Link
            href={`${adminBase}/orders`}
            className="text-xs text-ink-muted underline-offset-4 hover:text-brass hover:underline dark:text-stone-400"
          >
            Все заказы →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="rounded-xl border border-border bg-background px-5 py-8 text-center text-sm text-ink-muted dark:text-stone-400">
            Заказов пока нет.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-stone-400">
                  <th className="px-4 py-3 font-semibold">Номер</th>
                  <th className="px-4 py-3 font-semibold">Статус</th>
                  <th className="px-4 py-3 text-right font-semibold">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border last:border-b-0 transition-colors hover:bg-ink/[0.03] dark:hover:bg-bone/[0.04]"
                  >
                    <td className="px-4 py-3 font-medium text-ink dark:text-bone">
                      <Link
                        href={`${adminBase}/orders/${order.id}`}
                        className="hover:text-brass"
                      >
                        {order.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted dark:text-stone-400">
                      {STATUS_LABELS[order.status] ?? order.status}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-ink dark:text-bone">
                      {formatUzs(order.total, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
