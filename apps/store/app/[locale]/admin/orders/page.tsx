// Admin orders list. Server component: guarded by requireStaff() (via the admin
// layout, re-asserted here for defence in depth), reads a paginated/filterable
// slice via listAdminOrders, and renders a dense table with status filter tabs,
// a number/phone search box, and prev/next pagination. ru-primary labels.

import Link from 'next/link';

import { requireStaff } from '@/lib/admin/guard';
import { formatUzs } from '@/lib/money';
import { listAdminOrders } from '@/lib/admin/order-queries';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/admin/orders/status-badge';

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

function buildHref(base: string, current: SearchParams, patch: Partial<SearchParams>): string {
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
          <h1 className="font-display text-ink dark:text-bone text-3xl">Заказы</h1>
          <p className="text-ink-muted mt-1 text-sm dark:text-stone-400">Всего: {meta.total}</p>
        </div>
        {/* Search by number / phone */}
        <form action={base} method="get" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Номер или телефон"
            className="border-border text-ink focus:border-foreground dark:bg-ink/40 dark:text-bone h-10 w-56 rounded-md border bg-white px-3 text-sm"
          />
          <button
            type="submit"
            className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-10 items-center justify-center px-4 text-xs font-semibold tracking-widest uppercase"
          >
            Поиск
          </button>
        </form>
      </header>

      {/* Status filter tabs */}
      <nav className="border-border flex flex-wrap gap-2 border-b pb-3">
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
                  : 'text-ink-muted hover:bg-ink/5 hover:text-ink dark:hover:bg-bone/10 dark:text-stone-400')
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Table */}
      {data.length === 0 ? (
        <p className="border-border bg-background text-ink-muted rounded-xl border p-8 text-center text-sm dark:text-stone-400">
          Заказы не найдены.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-border text-label text-ink-muted border-b text-left font-semibold tracking-widest uppercase dark:text-stone-400">
                <th className="px-4 py-3">Номер</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3">Поз.</th>
                <th className="px-4 py-3">Сумма</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Оплата</th>
                <th className="px-4 py-3">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {data.map((o) => (
                <tr
                  key={o.number}
                  className="hover:bg-ink/[0.03] dark:hover:bg-bone/[0.04] transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`${base}/${encodeURIComponent(o.number)}`}
                      className="text-ink dark:text-bone font-medium hover:underline hover:underline-offset-4"
                    >
                      {o.number}
                    </Link>
                  </td>
                  <td className="text-ink-muted px-4 py-3 dark:text-stone-400">{o.phone ?? '—'}</td>
                  <td className="text-ink-muted px-4 py-3 dark:text-stone-400">{o.itemsCount}</td>
                  <td className="text-ink dark:text-bone px-4 py-3 font-medium whitespace-nowrap">
                    {formatUzs(o.total, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="text-ink-muted px-4 py-3 whitespace-nowrap dark:text-stone-400">
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
                className="border-border text-ink hover:border-foreground dark:text-bone rounded-md border px-3 py-1.5"
              >
                Назад
              </Link>
            )}
            {page < meta.totalPages && (
              <Link
                href={buildHref(base, { status, q }, { page: String(page + 1) })}
                className="border-border text-ink hover:border-foreground dark:text-bone rounded-md border px-3 py-1.5"
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
