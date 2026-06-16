// Admin catalog — products table. Staff-guarded RSC: search box (q), pagination,
// and a row per product (thumb, name, brand, price formatUzs, status, edit link).
// Reads via listAdminProducts; all mutation happens on the edit page.

import Link from 'next/link';

import { requireStaff } from '@/lib/admin/guard';
import { listAdminProducts } from '@/lib/admin/catalog-queries';
import { formatUzs } from '@/lib/money';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-brass/15 text-brass',
  draft: 'bg-secondary text-ink-muted',
  archived: 'bg-destructive/10 text-destructive',
};

export default async function AdminCatalogPage({ params, searchParams }: PageProps) {
  await requireStaff();
  const { locale } = await params;
  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const page = Math.max(1, Number(sp.page) || 1);

  const { data, meta } = await listAdminProducts({ q: q || undefined, page });

  const buildHref = (p: number) => {
    const usp = new URLSearchParams();
    if (q) usp.set('q', q);
    if (p > 1) usp.set('page', String(p));
    const qs = usp.toString();
    return `/${locale}/admin/catalog${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-ink">Продукты</h1>
          <p className="text-sm text-ink-muted">{meta.total} всего</p>
        </div>
        <Link
          href={`/${locale}/admin/catalog/new`}
          className="h-10 rounded-md bg-ink px-5 text-xs font-semibold uppercase tracking-widest text-bone leading-10 hover:bg-brass"
        >
          Новый продукт
        </Link>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Поиск по названию или slug…"
          className="h-10 w-full max-w-sm rounded-md border border-border bg-white px-3 text-sm text-ink outline-none focus:border-brass"
        />
        <button
          type="submit"
          className="h-10 rounded-md border border-border px-5 text-sm text-ink hover:border-brass"
        >
          Найти
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-secondary/50 text-[11px] uppercase tracking-widest text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Фото</th>
              <th className="px-4 py-3 font-semibold">Название</th>
              <th className="px-4 py-3 font-semibold">Бренд</th>
              <th className="px-4 py-3 font-semibold">Цена</th>
              <th className="px-4 py-3 font-semibold">Статус</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  Ничего не найдено
                </td>
              </tr>
            ) : (
              data.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <div className="h-12 w-12 overflow-hidden rounded border border-border bg-secondary">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${locale}/admin/catalog/${p.id}`}
                      className="font-medium text-ink hover:text-brass"
                    >
                      {p.name || p.slug}
                    </Link>
                    <div className="text-xs text-ink-muted">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{p.brand || '—'}</td>
                  <td className="px-4 py-3 text-ink">{formatUzs(p.price, locale)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        'rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ' +
                        (STATUS_BADGE[p.status] ?? 'bg-secondary text-ink-muted')
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${locale}/admin/catalog/${p.id}`}
                      className="text-brass hover:underline"
                    >
                      Редактировать
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">
            Страница {meta.page} из {meta.totalPages}
          </span>
          <div className="flex gap-2">
            {meta.page > 1 && (
              <Link
                href={buildHref(meta.page - 1)}
                className="rounded-md border border-border px-4 py-2 text-ink hover:border-brass"
              >
                Назад
              </Link>
            )}
            {meta.page < meta.totalPages && (
              <Link
                href={buildHref(meta.page + 1)}
                className="rounded-md border border-border px-4 py-2 text-ink hover:border-brass"
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
