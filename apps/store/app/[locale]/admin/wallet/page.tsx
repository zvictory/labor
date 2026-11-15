// Google Wallet: how many members have the card, messages to a segment, and
// what was sent. Google shows a message on the back of the card and rings the
// phone; Labor keeps it to one promotional message per card a week.

import { isAdmin, requireStaff } from '@/lib/admin/guard';
import { StatCard } from '@/components/admin/stat-card';
import { CampaignForm } from '@/components/admin/wallet/campaign-form';
import { googleWalletEnabled } from '@/lib/wallet/google/config';
import { listCampaigns, walletStats } from '@/lib/wallet/google/messages';

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(d);

export default async function AdminWalletPage() {
  const staff = await requireStaff();
  const enabled = googleWalletEnabled();
  const [stats, campaigns] = await Promise.all([walletStats(), listCampaigns()]);
  const cellCls = 'px-4 py-3';

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-ink dark:text-bone text-3xl">Google Wallet</h1>
        <p className="text-ink-muted mt-1 text-sm dark:text-stone-400">
          Сообщения приходят на обратную сторону карты и уведомлением на телефон. Только клиентам с
          согласием на рекламу; не больше одного рекламного сообщения на карту в неделю.
        </p>
      </header>

      {!enabled && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Google Wallet не настроен: в .env на сервере нет GOOGLE_WALLET_ISSUER_ID и
          GOOGLE_WALLET_SERVICE_ACCOUNT. Кнопка в кабинете и отправка сообщений выключены.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Карт создано"
          value={stats.passes}
          hint="Клиент открыл ссылку «Добавить»"
        />
        <StatCard
          label="Сохранены в телефоне"
          value={stats.saved}
          hint="По последней синхронизации"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          Новое сообщение
        </h2>
        <CampaignForm canSend={enabled && isAdmin(staff)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
          Отправленные
        </h2>
        {campaigns.length === 0 ? (
          <p className="text-ink-muted text-sm dark:text-stone-400">Сообщений пока не было.</p>
        ) : (
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-border text-label text-ink-muted border-b text-left font-semibold tracking-widest uppercase">
                  <th className={cellCls}>Когда</th>
                  <th className={cellCls}>Сообщение</th>
                  <th className={cellCls}>Кому</th>
                  <th className={cellCls}>Отправлено</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className={`${cellCls} whitespace-nowrap`}>{formatDate(c.createdAt)}</td>
                    <td className={cellCls}>
                      <span className="font-medium">{c.header}</span>
                      <span className="text-ink-muted block text-xs">{c.body}</span>
                    </td>
                    <td className={cellCls}>{c.segment}</td>
                    <td className={`${cellCls} whitespace-nowrap`}>
                      {c.sent} из {c.eligible}
                      {c.skipped > 0 ? ` · лимит ${c.skipped}` : ''}
                      {c.failed > 0 ? ` · ошибок ${c.failed}` : ''}
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
