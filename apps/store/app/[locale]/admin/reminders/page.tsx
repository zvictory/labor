// Refill reminders (lib/reminders/refill.ts): who gets one next, how many went
// out lately, and a button to send the due ones now. Staff see the list;
// sending is admin-only (lib/admin/reminder-actions.ts). Orders they bring in
// show in /admin/sources as telegram / reminder / refill.

import Link from 'next/link';

import { isAdmin, requireStaff } from '@/lib/admin/guard';
import { sendDueRefillReminders } from '@/lib/admin/reminder-actions';
import { db } from '@/lib/db';
import {
  REFILL_COOLDOWN_DAYS,
  REFILL_WINDOW_DAYS,
  loadDueReminders,
  refillDays,
  refillMessage,
} from '@/lib/reminders/refill';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; sent?: string; failed?: string }>;
};

const ERRORS: Record<string, string> = {
  admin_only: 'Отправляет только администратор.',
  no_bot: 'Бот не настроен (TELEGRAM_BOT_TOKEN).',
};

const formatDate = (d: Date): string =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Tashkent',
  }).format(d);

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminRemindersPage({ params, searchParams }: Props) {
  const user = await requireStaff();
  const { locale } = await params;
  const { error, sent, failed } = await searchParams;
  const days = refillDays();

  const [due, sentLately, refillOrders] = await Promise.all([
    loadDueReminders(),
    db.order.count({ where: { refillReminderAt: { gte: new Date(Date.now() - 30 * DAY_MS) } } }),
    db.order.count({
      where: {
        utmCampaign: 'refill',
        status: { not: 'canceled' },
        createdAt: { gte: new Date(Date.now() - 30 * DAY_MS) },
      },
    }),
  ]);
  const example = due[0] ? refillMessage(due[0]) : null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-ink dark:text-bone text-3xl">Напоминания о пополнении</h1>
        <p className="text-ink-muted mt-1 max-w-2xl text-sm dark:text-stone-400">
          Через {days} дней после доставки покупатель получает в Telegram одно сообщение со ссылками
          на купленные ароматы. Только те, кто входил через Telegram и не отписался (/stop); не тем,
          кто уже заказал снова; одному человеку — не чаще раза в {REFILL_COOLDOWN_DAYS} дней.
          Заказы, доставленные больше {days + REFILL_WINDOW_DAYS} дней назад, не напоминаются.
          Ежедневно отправляет cron на сервере.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {ERRORS[error] ?? 'Не удалось отправить.'}
        </p>
      )}
      {sent !== undefined && (
        <p
          role="status"
          className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          Отправлено: {sent}
          {Number(failed) > 0 ? `, не доставлено: ${failed}` : ''}.
        </p>
      )}

      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Ждут отправки сейчас', value: due.length },
          { label: 'Отправлено за 30 дней', value: sentLately },
          { label: 'Заказов по ссылкам из напоминаний, 30 дней', value: refillOrders },
        ].map((s) => (
          <div key={s.label} className="border-border rounded-xl border p-4">
            <dt className="text-ink-muted text-xs dark:text-stone-400">{s.label}</dt>
            <dd className="text-ink dark:text-bone mt-1 text-2xl font-medium">{s.value}</dd>
          </div>
        ))}
      </dl>

      {isAdmin(user) && due.length > 0 && (
        <form action={sendDueRefillReminders}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="bg-ink text-bone dark:bg-bone dark:text-ink rounded-md px-4 py-2 text-sm font-medium"
          >
            Отправить сейчас ({due.length})
          </button>
        </form>
      )}

      {due.length > 0 && (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-border text-label text-ink-muted border-b text-left font-semibold tracking-widest uppercase dark:text-stone-400">
                <th className="px-4 py-3">Заказ</th>
                <th className="px-4 py-3">Доставлен</th>
                <th className="px-4 py-3">Язык</th>
                <th className="px-4 py-3">Ароматы</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {due.map((c) => (
                <tr key={c.orderId}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/${locale}/admin/orders/${c.number}`}
                      className="text-ink dark:text-bone font-medium hover:underline"
                    >
                      {c.number}
                    </Link>
                  </td>
                  <td className="text-ink-muted px-4 py-3 whitespace-nowrap dark:text-stone-400">
                    {formatDate(c.deliveredAt)}
                  </td>
                  <td className="text-ink-muted px-4 py-3 dark:text-stone-400">{c.locale}</td>
                  <td className="text-ink dark:text-bone px-4 py-3">
                    {c.products.map((p) => p.name).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {example && (
        <section className="space-y-2">
          <h2 className="text-ink dark:text-bone text-sm font-medium">Так выглядит сообщение</h2>
          <pre className="border-border text-ink dark:text-bone rounded-xl border bg-stone-50/50 p-4 text-sm whitespace-pre-wrap dark:bg-ink/30">
            {example}
          </pre>
        </section>
      )}
    </div>
  );
}
