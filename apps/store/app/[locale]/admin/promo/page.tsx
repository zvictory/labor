// Promo codes: create, list, switch on and off. Server component, guarded by
// requireStaff() (via the admin layout, re-asserted here). A first-order code
// is the "bonus for the first purchase": give it out in the bot, on Instagram
// or on a campaign page.

import { requireStaff } from '@/lib/admin/guard';
import { createPromoCode, setPromoActive } from '@/lib/admin/promo-actions';
import { db } from '@/lib/db';
import { formatUzs } from '@/lib/money';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

const ERRORS: Record<string, string> = {
  invalid_code: 'Код: 3–32 символа, латиница, цифры, _ и -.',
  invalid_value:
    'Размер скидки: целое число больше нуля, для процента — не больше 100, для «N+1» — от 2 до 10.',
  invalid_number: 'Мин. сумма и лимит — целые числа.',
  invalid_date: 'Неверная дата.',
  duplicate_code: 'Такой код уже есть.',
  invalid_input: 'Проверьте поля формы.',
};

const fieldCls =
  'border-border text-ink focus:border-foreground dark:bg-ink/40 dark:text-bone h-10 w-full rounded-md border bg-white px-3 text-sm';
const labelCls = 'text-ink-muted mb-1 block text-xs font-medium dark:text-stone-400';

const formatDay = (d: Date | null): string =>
  d
    ? new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        timeZone: 'Asia/Tashkent',
      }).format(d)
    : '…';

export default async function AdminPromoPage({ params, searchParams }: Props) {
  await requireStaff();
  const { locale } = await params;
  const { error } = await searchParams;

  const codes = await db.promoCode.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-ink dark:text-bone text-3xl">Промокоды</h1>
        <p className="text-ink-muted mt-1 max-w-2xl text-sm dark:text-stone-400">
          Скидка считается от суммы товаров, доставка не дисконтируется. «Только первый заказ» —
          бонус к первой покупке: код примут, если у телефона или аккаунта ещё нет заказов. «N+1» —
          в каждой группе из N флаконов самый дешёвый бесплатно (для акции 2+1 размер 3); пробники
          не считаются.
        </p>
      </header>

      <form
        action={createPromoCode}
        className="border-border grid gap-4 rounded-xl border p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input type="hidden" name="locale" value={locale} />
        <div>
          <label htmlFor="promo-code" className={labelCls}>
            Код
          </label>
          <input
            id="promo-code"
            name="code"
            required
            placeholder="WELCOME10"
            className={fieldCls}
          />
        </div>
        <div>
          <label htmlFor="promo-kind" className={labelCls}>
            Тип
          </label>
          <select id="promo-kind" name="kind" className={fieldCls} defaultValue="percent">
            <option value="percent">Процент</option>
            <option value="fixed">Сумма, сум</option>
            <option value="bundle">N+1, каждый N-й бесплатно</option>
          </select>
        </div>
        <div>
          <label htmlFor="promo-value" className={labelCls}>
            Размер (%, сум или N)
          </label>
          <input id="promo-value" name="value" required inputMode="numeric" className={fieldCls} />
        </div>
        <div>
          <label htmlFor="promo-min" className={labelCls}>
            Мин. сумма товаров, сум
          </label>
          <input id="promo-min" name="minSubtotal" inputMode="numeric" className={fieldCls} />
        </div>
        <div>
          <label htmlFor="promo-max" className={labelCls}>
            Лимит использований
          </label>
          <input
            id="promo-max"
            name="maxUses"
            inputMode="numeric"
            placeholder="без лимита"
            className={fieldCls}
          />
        </div>
        <div>
          <label htmlFor="promo-start" className={labelCls}>
            Действует с
          </label>
          <input id="promo-start" name="startsAt" type="date" className={fieldCls} />
        </div>
        <div>
          <label htmlFor="promo-end" className={labelCls}>
            Действует по
          </label>
          <input id="promo-end" name="endsAt" type="date" className={fieldCls} />
        </div>
        <div>
          <label htmlFor="promo-note" className={labelCls}>
            Заметка
          </label>
          <input id="promo-note" name="note" maxLength={200} className={fieldCls} />
        </div>
        <label className="text-ink dark:text-bone flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="firstOrderOnly" className="accent-brass" />
          Только первый заказ
        </label>
        <div className="flex items-center justify-end gap-4 sm:col-span-2">
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {ERRORS[error] ?? ERRORS.invalid_input}
            </p>
          )}
          <button
            type="submit"
            className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-10 items-center justify-center px-5 text-xs font-semibold tracking-widest uppercase"
          >
            Создать
          </button>
        </div>
      </form>

      {codes.length === 0 ? (
        <p className="border-border text-ink-muted rounded-xl border p-8 text-center text-sm dark:text-stone-400">
          Промокодов пока нет.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-border text-label text-ink-muted border-b text-left font-semibold tracking-widest uppercase dark:text-stone-400">
                <th className="px-4 py-3">Код</th>
                <th className="px-4 py-3">Скидка</th>
                <th className="px-4 py-3">Условия</th>
                <th className="px-4 py-3">Использован</th>
                <th className="px-4 py-3">Период</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {codes.map((c) => (
                <tr key={c.id} className={c.active ? '' : 'opacity-50'}>
                  <td className="text-ink dark:text-bone px-4 py-3 font-mono font-medium">
                    {c.code}
                    {c.note && (
                      <span className="text-ink-muted block font-sans text-xs font-normal dark:text-stone-400">
                        {c.note}
                      </span>
                    )}
                  </td>
                  <td className="text-ink dark:text-bone px-4 py-3 whitespace-nowrap">
                    {c.kind === 'percent'
                      ? `${c.value}%`
                      : c.kind === 'bundle'
                        ? `${c.value - 1}+1`
                        : formatUzs(c.value, locale)}
                  </td>
                  <td className="text-ink-muted px-4 py-3 dark:text-stone-400">
                    {[
                      c.minSubtotal > 0 ? `от ${formatUzs(c.minSubtotal, locale)}` : null,
                      c.firstOrderOnly ? 'первый заказ' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </td>
                  <td className="text-ink-muted px-4 py-3 whitespace-nowrap dark:text-stone-400">
                    {c.usedCount}
                    {c.maxUses !== null ? ` / ${c.maxUses}` : ''}
                  </td>
                  <td className="text-ink-muted px-4 py-3 whitespace-nowrap dark:text-stone-400">
                    {c.startsAt || c.endsAt
                      ? `${formatDay(c.startsAt)} – ${formatDay(c.endsAt)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={setPromoActive}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="active" value={c.active ? 'false' : 'true'} />
                      <button
                        type="submit"
                        className="border-border text-ink hover:border-foreground dark:text-bone rounded-md border px-3 py-1.5 text-xs whitespace-nowrap"
                      >
                        {c.active ? 'Выключить' : 'Включить'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
