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
        <h1 className="font-display text-ink dark:text-bone text-4xl md:text-5xl">Обзор</h1>
        <p className="text-ink-muted mt-2 text-sm dark:text-stone-400">
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
        <h2 className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          Заказы по статусу
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ORDER_STATUSES.map((status) => (
            <div key={status} className="border-border bg-background rounded-lg border px-4 py-3">
              <p className="text-ink-muted text-xs dark:text-stone-400">
                {STATUS_LABELS[status] ?? status}
              </p>
              <p className="font-display text-ink dark:text-bone mt-1 text-2xl">
                {ordersByStatus[status]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent orders */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
            Последние заказы
          </h2>
          <Link
            href={`${adminBase}/orders`}
            className="text-ink-muted hover:text-foreground text-xs underline-offset-4 hover:underline dark:text-stone-400"
          >
            Все заказы →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="border-border bg-background text-ink-muted rounded-xl border px-5 py-8 text-center text-sm dark:text-stone-400">
            Заказов пока нет.
          </p>
        ) : (
          <div className="border-border bg-background overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border text-micro text-ink-muted border-b text-left tracking-[0.2em] uppercase dark:text-stone-400">
                  <th className="px-4 py-3 font-semibold">Номер</th>
                  <th className="px-4 py-3 font-semibold">Статус</th>
                  <th className="px-4 py-3 text-right font-semibold">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-border hover:bg-ink/[0.03] dark:hover:bg-bone/[0.04] border-b transition-colors last:border-b-0"
                  >
                    <td className="text-ink dark:text-bone px-4 py-3 font-medium">
                      <Link
                        href={`${adminBase}/orders/${order.id}`}
                        className="hover:underline hover:underline-offset-4"
                      >
                        {order.number}
                      </Link>
                    </td>
                    <td className="text-ink-muted px-4 py-3 dark:text-stone-400">
                      {STATUS_LABELS[order.status] ?? order.status}
                    </td>
                    <td className="text-ink dark:text-bone px-4 py-3 text-right font-medium tabular-nums">
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
