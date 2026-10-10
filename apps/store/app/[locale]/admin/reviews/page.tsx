// Buyers' review texts waiting for a decision, and the ones already decided.
// Star ratings count without moderation; only the text is held back. Server
// component, guarded by requireStaff() (via the admin layout, re-asserted here).

import Link from 'next/link';

import { requireStaff } from '@/lib/admin/guard';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { db } from '@/lib/db';
import { moderateReview } from '@/lib/reviews/actions';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
};

const TABS = [
  { value: 'pending', label: 'На проверке' },
  { value: 'published', label: 'Опубликованы' },
  { value: 'hidden', label: 'Скрыты' },
] as const;

type Tab = (typeof TABS)[number]['value'];

const ACTIONS: Record<Tab, { status: Tab; label: string }[]> = {
  pending: [
    { status: 'published', label: 'Опубликовать' },
    { status: 'hidden', label: 'Скрыть' },
  ],
  published: [{ status: 'hidden', label: 'Скрыть' }],
  hidden: [{ status: 'published', label: 'Опубликовать' }],
};

const formatDate = (d: Date): string =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(d);

export default async function AdminReviewsPage({ params, searchParams }: Props) {
  await requireStaff();
  const { locale } = await params;
  const sp = await searchParams;
  const status: Tab = TABS.some((t) => t.value === sp.status) ? (sp.status as Tab) : 'pending';
  const base = `/${locale}/admin/reviews`;

  const rows = await db.vote.findMany({
    where: { commentStatus: status, comment: { not: null } },
    orderBy: { updatedAt: status === 'pending' ? 'asc' : 'desc' },
    take: 100,
    select: {
      id: true,
      rating: true,
      comment: true,
      updatedAt: true,
      user: { select: { name: true, phone: true, email: true } },
      product: { select: { slug: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-ink dark:text-bone text-3xl">Отзывы</h1>
        <p className="text-ink-muted mt-1 max-w-2xl text-sm dark:text-stone-400">
          Оставить отзыв может только покупатель, получивший аромат. Оценка учитывается сразу, текст
          появляется на странице после публикации.
        </p>
      </header>

      <nav className="border-border flex flex-wrap gap-2 border-b pb-3">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'pending' ? base : `${base}?status=${tab.value}`}
            aria-current={tab.value === status ? 'page' : undefined}
            className={
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors ' +
              (tab.value === status
                ? 'bg-ink text-bone dark:bg-bone dark:text-ink'
                : 'text-ink-muted hover:bg-ink/5 hover:text-ink dark:hover:bg-bone/10 dark:text-stone-400')
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="border-border text-ink-muted rounded-xl border p-8 text-center text-sm dark:text-stone-400">
          Здесь пусто.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="border-border space-y-2 rounded-xl border p-4">
              <div className="text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-sm dark:text-stone-400">
                <span className="text-ink dark:text-bone font-medium">
                  {'★'.repeat(r.rating ?? 0)}
                  {'☆'.repeat(Math.max(0, 5 - (r.rating ?? 0)))}
                </span>
                <Link
                  href={`/${locale}/product/${r.product.slug}`}
                  className="text-ink dark:text-bone underline underline-offset-4"
                >
                  {resolveLocaleText(r.product.name, 'ru')}
                </Link>
                <span>{r.user.name ?? r.user.phone ?? r.user.email ?? '—'}</span>
                <span>{formatDate(r.updatedAt)}</span>
              </div>
              <p className="text-ink dark:text-bone text-sm whitespace-pre-line">{r.comment}</p>
              <div className="flex gap-2">
                {ACTIONS[status].map((a) => (
                  <form key={a.status} action={moderateReview}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value={a.status} />
                    <button
                      type="submit"
                      className="border-border text-ink hover:border-foreground dark:text-bone rounded-md border px-3 py-1.5 text-xs"
                    >
                      {a.label}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
