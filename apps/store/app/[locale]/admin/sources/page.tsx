// Which ads and links bring orders and requests (lib/admin/source-report.ts).
// Server component, staff only. The tags come from the links the shop puts in
// ads, posts and bios; the page explains how to build one.

import Link from 'next/link';

import { isAdmin, requireStaff } from '@/lib/admin/guard';
import { REPORT_PERIODS, getSourceReport, type ReportPeriod } from '@/lib/admin/source-report';
import { formatUzs } from '@/lib/money';
import { SITE_URL } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ days?: string }>;
};

const toPeriod = (raw: string | undefined): ReportPeriod => {
  const n = Number(raw);
  return (REPORT_PERIODS as readonly number[]).includes(n) ? (n as ReportPeriod) : 30;
};

const cellCls = 'px-4 py-3 whitespace-nowrap';

export default async function AdminSourcesPage({ params, searchParams }: Props) {
  const user = await requireStaff();
  const { locale } = await params;
  const days = toPeriod((await searchParams).days);
  const rows = await getSourceReport(days);
  const base = `/${locale}/admin/sources`;

  const totals = rows.reduce(
    (t, r) => ({
      orders: t.orders + r.orders,
      revenue: t.revenue + r.revenue,
      paidRevenue: t.paidRevenue + r.paidRevenue,
      leads: t.leads + r.leads,
    }),
    { orders: 0, revenue: 0, paidRevenue: 0, leads: 0 },
  );

  const example = `${SITE_URL}/uz/campaigns/2-plus-1?utm_source=instagram&utm_medium=paid&utm_campaign=2plus1_oct&utm_content=story_9x16`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-ink dark:text-bone text-3xl">Источники</h1>
        <p className="text-ink-muted mt-1 text-sm dark:text-stone-400">
          Заказы и заявки по рекламе и ссылкам, с которых пришёл покупатель. Отменённые заказы не
          считаются.
        </p>
      </header>

      <nav className="border-border flex flex-wrap gap-2 border-b pb-3">
        {REPORT_PERIODS.map((p) => (
          <Link
            key={p}
            href={p === 30 ? base : `${base}?days=${p}`}
            aria-current={p === days ? 'page' : undefined}
            className={
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors ' +
              (p === days
                ? 'bg-ink text-bone dark:bg-bone dark:text-ink'
                : 'text-ink-muted hover:bg-ink/5 hover:text-ink dark:hover:bg-bone/10 dark:text-stone-400')
            }
          >
            {p} дней
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="border-border bg-background text-ink-muted rounded-xl border p-8 text-center text-sm dark:text-stone-400">
          За этот период заказов и заявок нет.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-border text-label text-ink-muted border-b text-left font-semibold tracking-widest uppercase dark:text-stone-400">
                <th className="px-4 py-3">Источник</th>
                <th className="px-4 py-3">Канал</th>
                <th className="px-4 py-3">Кампания</th>
                <th className="px-4 py-3 text-right">Заказы</th>
                <th className="px-4 py-3 text-right">Сумма</th>
                <th className="px-4 py-3 text-right">Оплачено / доставлено</th>
                <th className="px-4 py-3 text-right">Заявки</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((r) => (
                <tr key={`${r.utmSource}|${r.utmMedium}|${r.utmCampaign}`}>
                  <td className={`${cellCls} text-ink dark:text-bone font-medium`}>
                    {r.utmSource ?? 'прямой заход'}
                  </td>
                  <td className={`${cellCls} text-ink-muted dark:text-stone-400`}>
                    {r.utmMedium ?? '—'}
                  </td>
                  <td className={`${cellCls} text-ink-muted dark:text-stone-400`}>
                    {r.utmCampaign ?? '—'}
                  </td>
                  <td className={`${cellCls} text-right`}>{r.orders}</td>
                  <td className={`${cellCls} text-right`}>{formatUzs(r.revenue, locale)}</td>
                  <td className={`${cellCls} text-right`}>
                    {r.paidOrders} · {formatUzs(r.paidRevenue, locale)}
                  </td>
                  <td className={`${cellCls} text-right`}>{r.leads}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-border text-ink dark:text-bone border-t font-medium">
                <td className={cellCls} colSpan={3}>
                  Всего
                </td>
                <td className={`${cellCls} text-right`}>{totals.orders}</td>
                <td className={`${cellCls} text-right`}>{formatUzs(totals.revenue, locale)}</td>
                <td className={`${cellCls} text-right`}>{formatUzs(totals.paidRevenue, locale)}</td>
                <td className={`${cellCls} text-right`}>{totals.leads}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {isAdmin(user) && (
        <section className="border-border text-ink-muted space-y-2 rounded-xl border p-5 text-sm dark:text-stone-400">
          <h2 className="text-ink dark:text-bone font-medium">Аудитории для рекламы Meta</h2>
          <p>
            Списки для Ads Manager → Аудитории → Индивидуализированная аудитория → Список клиентов.
            В файле телефоны и имена клиентов: храните его только до загрузки в Meta.
          </p>
          <ul className="space-y-1">
            <li>
              <a
                href="/api/admin/audience-csv?list=buyers"
                className="text-ink dark:text-bone underline underline-offset-4"
              >
                Покупатели (CSV)
              </a>{' '}
              — с суммой оплаченных заказов в колонке value, для похожей аудитории по ценности.
            </li>
            <li>
              <a
                href="/api/admin/audience-csv?list=leads"
                className="text-ink dark:text-bone underline underline-offset-4"
              >
                Заявки без покупки (CSV)
              </a>{' '}
              — для ретаргетинга.
            </li>
          </ul>
        </section>
      )}

      <section className="border-border text-ink-muted space-y-2 rounded-xl border p-5 text-sm dark:text-stone-400">
        <h2 className="text-ink dark:text-bone font-medium">Как пометить ссылку</h2>
        <p>
          Добавьте к ссылке на сайт метки <code>utm_source</code> (откуда: instagram, telegram),{' '}
          <code>utm_medium</code> (paid — реклама, bio, post, story), <code>utm_campaign</code>{' '}
          (название акции) и, если нужно, <code>utm_content</code> (какой креатив). Метки хранятся
          30 дней; заказ записывается на последнюю ссылку с метками. Клик по рекламе Meta без меток
          виден как «meta (fbclid)» в заказе.
        </p>
        <p className="break-all">
          Пример: <code>{example}</code>
        </p>
      </section>
    </div>
  );
}
