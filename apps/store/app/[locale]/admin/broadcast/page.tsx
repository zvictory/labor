// Telegram announcements: write per language, send to everyone who talks to the
// bot and has not sent /stop, see how earlier ones went. Sending is admin-only
// (lib/admin/broadcast-actions.ts); staff see the history.

import { isAdmin, requireStaff } from '@/lib/admin/guard';
import { sendBroadcast } from '@/lib/admin/broadcast-actions';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { db } from '@/lib/db';
import { countRecipients } from '@/lib/telegram/broadcast';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; sent?: string }>;
};

const ERRORS: Record<string, string> = {
  admin_only: 'Рассылку отправляет только администратор.',
  ru_required: 'Нужен текст на русском — он уходит всем, у кого нет перевода.',
  too_long: 'Текст длиннее 3500 символов.',
  confirm_required: 'Отметьте подтверждение перед отправкой.',
  already_sending: 'Предыдущая рассылка ещё отправляется.',
  no_bot: 'Бот не настроен (TELEGRAM_BOT_TOKEN).',
  no_recipients: 'Получателей нет: никто ещё не открывал бота.',
  invalid: 'Проверьте поля формы.',
};

const fieldCls =
  'border-border text-ink focus:border-foreground dark:bg-ink/40 dark:text-bone w-full rounded-md border bg-white px-3 py-2 text-sm';
const labelCls = 'text-ink-muted mb-1 block text-xs font-medium dark:text-stone-400';

const formatDate = (d: Date): string =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(d);

export default async function AdminBroadcastPage({ params, searchParams }: Props) {
  const user = await requireStaff();
  const { locale } = await params;
  const { error, sent } = await searchParams;
  const canSend = isAdmin(user);

  const [recipients, history] = await Promise.all([
    countRecipients(),
    db.broadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-ink dark:text-bone text-3xl">Рассылка в Telegram</h1>
        <p className="text-ink-muted mt-1 max-w-2xl text-sm dark:text-stone-400">
          Сообщение получат все, кто открывал бота и не отписался (/stop): сейчас это{' '}
          <strong className="text-ink dark:text-bone">{recipients}</strong>. Каждый получит текст на
          своём языке, без перевода — русский. Внизу сообщения бот добавит строку про /stop.
        </p>
      </header>

      {sent && (
        <p
          role="status"
          className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          Рассылка #{sent} отправляется. Обновите страницу, чтобы увидеть прогресс.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {ERRORS[error] ?? ERRORS.invalid}
        </p>
      )}

      {canSend ? (
        <form action={sendBroadcast} className="border-border space-y-4 rounded-xl border p-5">
          <input type="hidden" name="locale" value={locale} />
          <div>
            <label htmlFor="bc-ru" className={labelCls}>
              Русский (обязательно)
            </label>
            <textarea
              id="bc-ru"
              name="ru"
              rows={5}
              maxLength={3500}
              required
              className={fieldCls}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="bc-uz" className={labelCls}>
                Oʻzbekcha
              </label>
              <textarea id="bc-uz" name="uz" rows={5} maxLength={3500} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="bc-en" className={labelCls}>
                English
              </label>
              <textarea id="bc-en" name="en" rows={5} maxLength={3500} className={fieldCls} />
            </div>
          </div>
          <label className="text-ink dark:text-bone flex items-start gap-2 text-sm">
            <input type="checkbox" name="confirm" required className="accent-brass mt-0.5" />
            Отправить {recipients} получателям. Отменить отправку будет нельзя.
          </label>
          <button
            type="submit"
            className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-10 items-center justify-center px-5 text-xs font-semibold tracking-widest uppercase"
          >
            Отправить
          </button>
        </form>
      ) : (
        <p className="border-border text-ink-muted rounded-xl border p-5 text-sm dark:text-stone-400">
          Отправлять рассылки может только администратор.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-ink dark:text-bone text-lg font-medium">История</h2>
        {history.length === 0 ? (
          <p className="text-ink-muted text-sm dark:text-stone-400">Рассылок ещё не было.</p>
        ) : (
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-border text-label text-ink-muted border-b text-left font-semibold tracking-widest uppercase dark:text-stone-400">
                  <th className="px-4 py-3">Когда</th>
                  <th className="px-4 py-3">Текст</th>
                  <th className="px-4 py-3">Доставлено</th>
                  <th className="px-4 py-3">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {history.map((b) => (
                  <tr key={b.id} className="align-top">
                    <td className="text-ink-muted px-4 py-3 whitespace-nowrap dark:text-stone-400">
                      {formatDate(b.createdAt)}
                      {b.createdBy && <span className="block text-xs">{b.createdBy}</span>}
                    </td>
                    <td className="text-ink dark:text-bone max-w-md px-4 py-3 whitespace-pre-line">
                      {resolveLocaleText(b.text, 'ru').slice(0, 280)}
                    </td>
                    <td className="text-ink-muted px-4 py-3 whitespace-nowrap dark:text-stone-400">
                      {b.sent} / {b.recipients}
                      {b.failed > 0 && <span className="block text-xs">не дошло: {b.failed}</span>}
                    </td>
                    <td className="text-ink-muted px-4 py-3 whitespace-nowrap dark:text-stone-400">
                      {b.status === 'sending' ? 'отправляется…' : 'готово'}
                    </td>
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
