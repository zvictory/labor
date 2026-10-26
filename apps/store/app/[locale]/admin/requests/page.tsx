// "Help me choose" requests from the storefront (lib/consult). Server component:
// guarded by requireStaff() (via the admin layout, re-asserted here). New ones
// first; staff mark a request done once they have called back.

import Link from 'next/link';

import { requireStaff } from '@/lib/admin/guard';
import { setConsultStatus } from '@/lib/consult/actions';
import { telHref } from '@/lib/store-contact';
import { db } from '@/lib/db';
import { describeAttribution } from '@/lib/attribution/attribution';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
};

const PAGE_SIZE = 50;

const TABS = [
  { value: 'new', label: 'Новые' },
  { value: 'done', label: 'Обработаны' },
] as const;

const SOURCE_LABEL: Record<string, string> = {
  product: 'Аромат',
  finder: 'Подбор',
  contacts: 'Контакты',
  corporate: 'Корпоративный',
  launch: 'Лист ожидания',
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(date);
}

export default async function AdminRequestsPage({ params, searchParams }: Props) {
  await requireStaff();
  const { locale } = await params;
  const sp = await searchParams;
  const status = sp.status === 'done' ? 'done' : 'new';
  const page = Math.max(1, Number(sp.page) || 1);
  const base = `/${locale}/admin/requests`;

  const [rows, total] = await Promise.all([
    db.consultRequest.findMany({
      where: { status },
      orderBy: { createdAt: status === 'new' ? 'asc' : 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.consultRequest.count({ where: { status } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-ink dark:text-bone text-3xl">Заявки на подбор</h1>
        <p className="text-ink-muted mt-1 text-sm dark:text-stone-400">
          Посетитель оставил телефон и ждёт звонка или сообщения. Всего: {total}
        </p>
      </header>

      <nav className="border-border flex flex-wrap gap-2 border-b pb-3">
        {TABS.map((tab) => {
          const active = tab.value === status;
          return (
            <Link
              key={tab.value}
              href={tab.value === 'new' ? base : `${base}?status=${tab.value}`}
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

      {rows.length === 0 ? (
        <p className="border-border bg-background text-ink-muted rounded-xl border p-8 text-center text-sm dark:text-stone-400">
          Заявок нет.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-border text-label text-ink-muted border-b text-left font-semibold tracking-widest uppercase dark:text-stone-400">
                <th className="px-4 py-3">Когда</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3">Имя</th>
                <th className="px-4 py-3">Сообщение</th>
                <th className="px-4 py-3">Откуда</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="text-ink-muted px-4 py-3 whitespace-nowrap dark:text-stone-400">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <a
                      href={telHref(r.phone)}
                      className="text-ink dark:text-bone font-medium hover:underline"
                    >
                      {r.phone}
                    </a>
                  </td>
                  <td className="text-ink dark:text-bone px-4 py-3">{r.name ?? '—'}</td>
                  <td className="text-ink dark:text-bone max-w-md px-4 py-3 whitespace-pre-line">
                    {r.message ?? '—'}
                  </td>
                  <td className="text-ink-muted px-4 py-3 dark:text-stone-400">
                    {SOURCE_LABEL[r.source] ?? r.source} · {r.locale}
                    {describeAttribution(r) && (
                      <span className="block text-xs">Реклама: {describeAttribution(r)}</span>
                    )}
                    {r.productSlug && (
                      <Link
                        href={`/${locale}/product/${r.productSlug}`}
                        className="block underline underline-offset-4"
                      >
                        {r.productSlug}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={setConsultStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={r.status === 'new' ? 'done' : 'new'}
                      />
                      <button
                        type="submit"
                        className="border-border text-ink hover:border-foreground dark:text-bone rounded-md border px-3 py-1.5 text-xs whitespace-nowrap"
                      >
                        {r.status === 'new' ? 'Обработана' : 'Вернуть в новые'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted dark:text-stone-400">
            Стр. {page} из {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`${base}?status=${status}&page=${page - 1}`}
                className="border-border text-ink hover:border-foreground dark:text-bone rounded-md border px-3 py-1.5"
              >
                Назад
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`${base}?status=${status}&page=${page + 1}`}
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
