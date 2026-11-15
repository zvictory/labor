// The loyalty programme at a glance: members, tiers, the bonus Labor owes, the
// last 30 days, recent moves, and a search by card or phone.

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireStaff } from '@/lib/admin/guard';
import { StatCard } from '@/components/admin/stat-card';
import { db } from '@/lib/db';
import { formatUzs } from '@/lib/money';
import { normalizeUzPhone } from '@/lib/phone';
import { getLoyaltyOverview, KIND_LABEL } from '@/lib/loyalty/admin';
import { formatCardNumber, parseCardNumber } from '@/lib/loyalty/rules';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(d);

export default async function AdminLoyaltyPage({ params, searchParams }: Props) {
  await requireStaff();
  const { locale } = await params;
  const { q } = await searchParams;
  const base = `/${locale}/admin/loyalty`;

  let notFound = false;
  if (q) {
    const card = parseCardNumber(q);
    const phone = card ? null : normalizeUzPhone(q);
    const account = card
      ? await db.loyaltyAccount.findUnique({
          where: { cardNumber: card },
          select: { cardNumber: true },
        })
      : phone
        ? await db.loyaltyAccount.findFirst({
            where: { user: { phone } },
            select: { cardNumber: true },
          })
        : null;
    if (account) redirect(`${base}/${account.cardNumber}`);
    notFound = true;
  }

  const o = await getLoyaltyOverview();
  const cellCls = 'px-4 py-3';

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-ink dark:text-bone text-3xl">Лояльность</h1>
          <p className="text-ink-muted mt-1 text-sm dark:text-stone-400">
            Уровни 3 / 5 / 7%, бонусами до 30% покупки, срок 180 дней.
          </p>
        </div>
        <form className="flex gap-2" action={base}>
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Карта или телефон"
            className="border-border dark:bg-ink/40 h-10 w-56 rounded-md border bg-white px-3 text-sm"
          />
          <button className="border-border h-10 border px-4 text-xs font-semibold tracking-widest uppercase">
            Найти
          </button>
        </form>
      </header>
      {notFound && <p className="text-sm text-red-700">Ничего не найдено по «{q}».</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Участники"
          value={o.members}
          hint={`Согласие на рекламу: ${o.withConsent}`}
        />
        <StatCard
          label="Уровни"
          value={`${o.byTier.labor} / ${o.byTier.silver} / ${o.byTier.gold}`}
          hint="Labor / Silver / Gold"
        />
        <StatCard
          label="Долг по бонусам"
          value={formatUzs(o.liability, 'ru')}
          hint="Не потрачено и не сгорело"
        />
        <StatCard
          label="30 дней"
          value={formatUzs(o.last30.earn ?? 0, 'ru')}
          hint={`Начислено · списано ${formatUzs(-(o.last30.spend ?? 0), 'ru')} · сгорело ${formatUzs(-(o.last30.expire ?? 0), 'ru')} · ко дню рождения ${formatUzs(o.last30.birthday ?? 0, 'ru')}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          Последние операции
        </h2>
        {o.recent.length === 0 ? (
          <p className="text-ink-muted text-sm dark:text-stone-400">Операций пока нет.</p>
        ) : (
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-border text-label text-ink-muted border-b text-left font-semibold tracking-widest uppercase dark:text-stone-400">
                  <th className={cellCls}>Когда</th>
                  <th className={cellCls}>Карта</th>
                  <th className={cellCls}>Операция</th>
                  <th className={cellCls}>Сумма</th>
                  <th className={cellCls}>Где</th>
                  <th className={cellCls}>Сотрудник</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {o.recent.map((r) => (
                  <tr key={r.id}>
                    <td className={`${cellCls} whitespace-nowrap`}>{formatDate(r.createdAt)}</td>
                    <td className={cellCls}>
                      <Link href={`${base}/${r.cardNumber}`} className="font-mono hover:underline">
                        {formatCardNumber(r.cardNumber)}
                      </Link>
                      {r.memberName ? (
                        <span className="text-ink-muted ml-2">{r.memberName}</span>
                      ) : null}
                    </td>
                    <td className={cellCls}>
                      {KIND_LABEL[r.kind] ?? r.kind}
                      {r.note ? (
                        <span className="text-ink-muted block text-xs">{r.note}</span>
                      ) : null}
                    </td>
                    <td className={`${cellCls} font-mono whitespace-nowrap tabular-nums`}>
                      {r.amount > 0 ? '+' : '−'}
                      {formatUzs(Math.abs(r.amount), 'ru')}
                    </td>
                    <td className={cellCls}>
                      {r.orderNumber ? (
                        <Link
                          href={`/${locale}/admin/orders/${encodeURIComponent(r.orderNumber)}`}
                          className="hover:underline"
                        >
                          {r.orderNumber}
                        </Link>
                      ) : (
                        (r.branch ?? '—')
                      )}
                    </td>
                    <td className={cellCls}>{r.staffName ?? '—'}</td>
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
