// One member: card, tier, balance and what expires, the full ledger, personal
// messages sent, and the two admin forms.

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { isAdmin, requireStaff } from '@/lib/admin/guard';
import { AdjustForm, MessageForm } from '@/components/admin/loyalty/member-forms';
import { formatUzs } from '@/lib/money';
import { getMemberByCard, KIND_LABEL } from '@/lib/loyalty/admin';
import { getLoyaltyState } from '@/lib/loyalty/loyalty';
import { tierName } from '@/lib/loyalty/messages';
import { formatCardNumber, parseCardNumber } from '@/lib/loyalty/rules';

type Props = { params: Promise<{ locale: string; card: string }> };

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(d);

export default async function AdminLoyaltyMemberPage({ params }: Props) {
  const staff = await requireStaff();
  const { locale, card } = await params;
  const cardNumber = parseCardNumber(card);
  if (!cardNumber) notFound();
  const member = await getMemberByCard(cardNumber);
  if (!member) notFound();
  const state = await getLoyaltyState(member.id);
  const sectionTitleCls = 'text-muted-foreground font-mono text-micro tracking-[0.28em] uppercase';
  const cellCls = 'px-4 py-2';

  const messageBlocked = !member.marketingConsentAt
    ? 'Клиент не давал согласия на рекламные сообщения.'
    : !member.user.telegramId
      ? 'У клиента нет Telegram: личное сообщение отправить некуда (Wallet появится позже).'
      : null;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <Link href={`/${locale}/admin/loyalty`} className="text-ink-muted text-xs hover:underline">
          ← Лояльность
        </Link>
        <h1 className="font-display text-ink dark:text-bone text-3xl">
          {member.user.name ?? 'Клиент'} ·{' '}
          <span className="font-mono">{formatCardNumber(member.cardNumber)}</span>
        </h1>
        <p className="text-ink-muted text-sm dark:text-stone-400">
          {member.user.phone ?? 'без телефона'} ·{' '}
          {member.user.telegramId ? 'Telegram есть' : 'без Telegram'} · день рождения:{' '}
          {member.user.birthDate
            ? new Intl.DateTimeFormat('ru-RU', {
                day: 'numeric',
                month: 'long',
                timeZone: 'UTC',
              }).format(member.user.birthDate)
            : 'не указан'}{' '}
          · согласие на рекламу:{' '}
          {member.marketingConsentAt ? `да (${member.marketingConsentSource ?? '—'})` : 'нет'}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="border-border rounded-xl border p-5">
          <p className={sectionTitleCls}>Бонусы</p>
          <p className="font-display mt-2 text-3xl">{formatUzs(state.available, 'ru')}</p>
          {state.expiringSoon[0] && (
            <p className="mt-1 text-xs text-amber-800">
              {formatUzs(
                state.expiringSoon.reduce((s, l) => s + l.amount, 0),
                'ru',
              )}{' '}
              сгорят в ближайшие 14 дней
            </p>
          )}
        </div>
        <div className="border-border rounded-xl border p-5">
          <p className={sectionTitleCls}>Уровень</p>
          <p className="font-display mt-2 text-3xl">
            {tierName(state.tier)} · {state.rate}%
          </p>
          <p className="text-ink-muted mt-1 text-xs">
            За 12 месяцев: {formatUzs(state.spend12m, 'ru')}
            {state.next
              ? ` · до ${tierName(state.next.tier)} ${formatUzs(state.next.remaining, 'ru')}`
              : ''}
          </p>
        </div>
        <div className="border-border rounded-xl border p-5">
          <p className={sectionTitleCls}>Участник с</p>
          <p className="font-display mt-2 text-3xl">{formatDate(member.createdAt).slice(0, 8)}</p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className={sectionTitleCls}>Личное сообщение</h2>
          <MessageForm accountId={member.id} disabled={messageBlocked} />
          {member.messages.length > 0 && (
            <ul className="divide-border divide-y text-sm">
              {member.messages.map((m) => (
                <li key={m.id} className="py-2">
                  <span className="text-ink-muted text-xs">
                    {formatDate(m.createdAt)} · {m.channel} · {m.status}
                  </span>
                  <p className="whitespace-pre-line">{m.text}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        {isAdmin(staff) && (
          <section className="space-y-3">
            <h2 className={sectionTitleCls}>Корректировка</h2>
            <AdjustForm accountId={member.id} />
          </section>
        )}
      </div>

      <section className="space-y-3">
        <h2 className={sectionTitleCls}>Операции</h2>
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <tbody className="divide-border divide-y">
              {member.entries.map((e) => (
                <tr key={e.id}>
                  <td className={`${cellCls} whitespace-nowrap`}>{formatDate(e.createdAt)}</td>
                  <td className={cellCls}>
                    {KIND_LABEL[e.kind] ?? e.kind}
                    {e.note ? <span className="text-ink-muted block text-xs">{e.note}</span> : null}
                  </td>
                  <td className={`${cellCls} font-mono whitespace-nowrap tabular-nums`}>
                    {e.amount > 0 ? '+' : '−'}
                    {formatUzs(Math.abs(e.amount), 'ru')}
                  </td>
                  <td className={`${cellCls} text-ink-muted text-xs`}>
                    {e.purchaseAmount ? `с покупки ${formatUzs(e.purchaseAmount, 'ru')}` : ''}
                    {e.branch ? ` · ${e.branch}` : ''}
                    {e.expiresAt && e.amount > 0
                      ? ` · до ${formatDate(e.expiresAt).slice(0, 8)}`
                      : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
