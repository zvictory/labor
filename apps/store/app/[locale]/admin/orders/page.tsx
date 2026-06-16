// Admin orders list. Server component: guarded by requireStaff() (via the admin
// layout, re-asserted here for defence in depth), reads a paginated/filterable
// slice via listAdminOrders, and renders a dense table with status filter tabs,
// a number/phone search box, and prev/next pagination. ru-primary labels.

import Link from 'next/link';

import { requireStaff } from '@/lib/admin/guard';
import { formatUzs } from '@/lib/money';
import { listAdminOrders } from '@/lib/admin/order-queries';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/components/admin/orders/status-badge';

type SearchParams = { status?: string; q?: string; page?: string };

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: 'Все' },
  { value: 'pending', label: 'Ожидают' },
  { value: 'confirmed', label: 'Подтверждены' },
  { value: 'paid', label: 'Оплачены' },
  { value: 'shipped', label: 'Отправлены' },
  { value: 'delivered', label: 'Доставлены' },
  { value: 'canceled', label: 'Отменены' },
];

function buildHref(
  base: string,
  current: SearchParams,
  patch: Partial<SearchParams>,
): string {
  const sp = new URLSearchParams();
  const merged = { ...current, ...patch };
  if (merged.status) sp.set('status', merged.status);
  if (merged.q) sp.set('q', merged.q);
  if (merged.page && merged.page !== '1') sp.set('page', merged.page);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function AdminOrdersPage({ params, searchParams }: Props) {
  await requireStaff();
  const { locale } = await params;
  const sp = await searchParams;

  const status = sp.status ?? '';
  const q = sp.q ?? '';
  const page = Math.max(1, Number(sp.page) || 1);

  const { data, meta } = await listAdminOrders({
    status: status || undefined,
    q: q || undefined,
    page,
  });

  const base = `/${locale}/admin/orders`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink dark:text-bone">Заказы</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-stone-400">
            Всего: {meta.total}
          </p>
        </div>
        {/* Search by number / phone */}
        <form action={base} method="get" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Номер или телефон"
            className="h-10 w-56 rounded-md border border-border bg-white px-3 text-sm text-ink outline-none focus:border-brass dark:bg-ink/40 dark:text-bone"
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center bg-ink px-4 text-xs font-semibold uppercase tracking-widest text-bone hover:bg-brass dark:bg-bone dark:text-ink"
          >
            Поиск
          </button>
        </form>
      </header>

      {/* Status filter tabs */}
      <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
        {STATUS_TABS.map((tab) => {
          const active = tab.value === status;
          return (
            <Link
              key={tab.value || 'all'}
              href={buildHref(base, { q }, { status: tab.value, page: '1' })}
              aria-current={active ? 'page' : undefined}
              className={
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors ' +
                (active
                  ? 'bg-ink text-bone dark:bg-bone dark:text-ink'
                  : 'text-ink-muted hover:bg-ink/5 hover:text-ink dark:text-stone-400 dark:hover:bg-bone/10')
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Table */}
      {data.length === 0 ? (
        <p className="rounded-xl border border-border bg-background p-8 text-center text-sm text-ink-muted dark:text-stone-400">
          Заказы не найдены.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-widest text-ink-muted dark:text-stone-400">
                <th className="px-4 py-3">Номер</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3">Поз.</th>
                <th className="px-4 py-3">Сумма</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Оплата</th>
                <th className="px-4 py-3">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((o) => (
                <tr
                  key={o.number}
                  className="transition-colors hover:bg-ink/[0.03] dark:hover:bg-bone/[0.04]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`${base}/${encodeURIComponent(o.number)}`}
                      className="font-medium text-ink hover:text-brass dark:text-bone"
                    >
                      {o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted dark:text-stone-400">
                    {o.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-muted dark:text-stone-400">
                    {o.itemsCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-ink dark:text-bone">
                    {formatUzs(o.total, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted dark:text-stone-400">
                    {formatDate(o.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted dark:text-stone-400">
            Стр. {meta.page} из {meta.totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildHref(base, { status, q }, { page: String(page - 1) })}
                className="rounded-md border border-border px-3 py-1.5 text-ink hover:border-brass dark:text-bone"
              >
                Назад
              </Link>
            )}
            {page < meta.totalPages && (
              <Link
                href={buildHref(base, { status, q }, { page: String(page + 1) })}
                className="rounded-md border border-border px-3 py-1.5 text-ink hover:border-brass dark:text-bone"
              >
                Вперёд
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
