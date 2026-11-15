'use client';

// Two forms on a member's admin page: a personal message, and (admin only) a
// correction to the balance with a reason.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { MoneyInput } from '@/components/admin/money-input';
import { adjustMemberBalance, messageMember } from '@/lib/loyalty/admin-actions';
import { sendWalletPersonal } from '@/lib/wallet/google/admin-actions';
import { MESSAGE_BODY_MAX, MESSAGE_HEADER_MAX } from '@/lib/wallet/google/pass';

const ERRORS: Record<string, string> = {
  no_consent: 'Клиент не давал согласия на рекламные сообщения',
  no_channel: 'У клиента нет Telegram: сообщение не отправлено',
  failed: 'Telegram не принял сообщение',
  admin_only: 'Только для администратора',
  bonus_too_much: 'Списание больше доступного баланса',
  input_invalid: 'Проверьте поля',
  no_pass: 'У клиента нет карты в Google Wallet',
  quota: 'Лимит уведомлений на сегодня исчерпан: попробуйте завтра',
  off: 'Google Wallet не настроен на сервере',
};

const fieldCls =
  'w-full rounded-md border border-border bg-white px-3 text-sm text-ink dark:bg-ink/40 dark:text-bone';
const buttonCls =
  'bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-10 items-center justify-center px-5 text-xs font-semibold tracking-widest uppercase disabled:opacity-50';

function Status({ value }: { value: { ok: boolean; text: string } | null }) {
  if (!value) return null;
  return (
    <p role="status" className={value.ok ? 'text-sm text-emerald-700' : 'text-sm text-red-700'}>
      {value.text}
    </p>
  );
}

export function MessageForm({
  accountId,
  disabled,
}: {
  accountId: number;
  disabled: string | null;
}) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (disabled) return <p className="text-ink-muted text-sm dark:text-stone-400">{disabled}</p>;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await messageMember({ accountId, text });
          setStatus(
            r.ok
              ? { ok: true, text: 'Отправлено' }
              : { ok: false, text: ERRORS[r.error] ?? r.error },
          );
          if (r.ok) setText('');
          router.refresh();
        });
      }}
    >
      <textarea
        rows={3}
        maxLength={1000}
        className={`${fieldCls} py-2`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Мадина, для вас новинка с нотами ванили…"
      />
      <button type="submit" disabled={pending || text.trim().length < 2} className={buttonCls}>
        Отправить в Telegram
      </button>
      <Status value={status} />
    </form>
  );
}

export function AdjustForm({ accountId }: { accountId: number }) {
  const [amount, setAmount] = useState<number | null>(null);
  const [sign, setSign] = useState<1 | -1>(1);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!amount) return;
        startTransition(async () => {
          const r = await adjustMemberBalance({ accountId, amount: sign * amount, note });
          setStatus(
            r.ok
              ? { ok: true, text: 'Сохранено' }
              : { ok: false, text: ERRORS[r.error] ?? r.error },
          );
          if (r.ok) {
            setAmount(null);
            setNote('');
          }
          router.refresh();
        });
      }}
    >
      <div className="flex gap-2">
        <select
          aria-label="Начислить или списать"
          className={`${fieldCls} h-10 w-32`}
          value={sign}
          onChange={(e) => setSign(e.target.value === '-1' ? -1 : 1)}
        >
          <option value={1}>Начислить</option>
          <option value={-1}>Списать</option>
        </select>
        <MoneyInput
          id="adj-amount"
          className={`${fieldCls} h-10`}
          value={amount}
          onChange={setAmount}
        />
      </div>
      <input
        className={`${fieldCls} h-10`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Причина (обязательно)"
        maxLength={300}
      />
      <button
        type="submit"
        disabled={pending || !amount || note.trim().length < 3}
        className={buttonCls}
      >
        Сохранить
      </button>
      <Status value={status} />
    </form>
  );
}

export function WalletMessageForm({ accountId }: { accountId: number }) {
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await sendWalletPersonal({ accountId, header, body });
          setStatus(
            r.ok
              ? { ok: true, text: 'Отправлено' }
              : { ok: false, text: ERRORS[r.error] ?? r.error },
          );
          if (r.ok) {
            setHeader('');
            setBody('');
          }
          router.refresh();
        });
      }}
    >
      <input
        className={`${fieldCls} h-10`}
        maxLength={MESSAGE_HEADER_MAX}
        value={header}
        onChange={(e) => setHeader(e.target.value)}
        placeholder={`Заголовок (до ${MESSAGE_HEADER_MAX})`}
      />
      <textarea
        rows={2}
        maxLength={MESSAGE_BODY_MAX}
        className={`${fieldCls} py-2`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`Текст (до ${MESSAGE_BODY_MAX})`}
      />
      <button
        type="submit"
        disabled={pending || header.trim().length < 2 || body.trim().length < 2}
        className={buttonCls}
      >
        Отправить в Google Wallet
      </button>
      <Status value={status} />
    </form>
  );
}
