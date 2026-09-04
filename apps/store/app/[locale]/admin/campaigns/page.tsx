// Admin campaigns list + create. Server component: guarded by requireStaff(),
// lists campaigns via listAdminCampaigns, and embeds the CampaignForm for creating
// a new one (a successful create redirects to its edit page). ru-primary labels.

import Link from 'next/link';

import { requireStaff } from '@/lib/admin/guard';
import { listAdminCampaigns } from '@/lib/admin/campaign-queries';
import { CampaignForm } from '@/components/admin/campaigns/campaign-form';

type Props = { params: Promise<{ locale: string }> };

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date);
}

export default async function AdminCampaignsPage({ params }: Props) {
  await requireStaff();
  const { locale } = await params;

  const campaigns = await listAdminCampaigns();
  const base = `/${locale}/admin/campaigns`;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-ink dark:text-bone text-3xl">Кампании</h1>
        <p className="text-ink-muted mt-1 text-sm dark:text-stone-400">Всего: {campaigns.length}</p>
      </header>

      {/* Existing campaigns */}
      <section className="space-y-3">
        {campaigns.length === 0 ? (
          <p className="border-border bg-background text-ink-muted rounded-xl border p-8 text-center text-sm dark:text-stone-400">
            Кампаний пока нет.
          </p>
        ) : (
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-border text-label text-ink-muted border-b text-left font-semibold tracking-widest uppercase dark:text-stone-400">
                  <th className="px-4 py-3">Заголовок</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Слайды</th>
                  <th className="px-4 py-3">Товары</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Обновлено</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-ink/[0.03] dark:hover:bg-bone/[0.04] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`${base}/${c.id}`}
                        className="text-ink dark:text-bone font-medium hover:underline hover:underline-offset-4"
                      >
                        {c.title || '(без названия)'}
                      </Link>
                    </td>
                    <td className="text-ink-muted px-4 py-3 dark:text-stone-400">{c.slug}</td>
                    <td className="text-ink-muted px-4 py-3 dark:text-stone-400">
                      {c.slidesCount}
                    </td>
                    <td className="text-ink-muted px-4 py-3 dark:text-stone-400">
                      {c.productsCount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ' +
                          (c.active
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-stone-300 bg-stone-100 text-stone-600')
                        }
                      >
                        {c.active ? 'Активна' : 'Скрыта'}
                      </span>
                    </td>
                    <td className="text-ink-muted px-4 py-3 whitespace-nowrap dark:text-stone-400">
                      {formatDate(c.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* New campaign */}
      <section className="border-border space-y-4 border-t pt-8">
        <h2 className="font-display text-ink dark:text-bone text-2xl">Новая кампания</h2>
        <div className="border-border bg-background rounded-xl border p-6">
          <CampaignForm locale={locale} />
        </div>
      </section>
    </div>
  );
}
