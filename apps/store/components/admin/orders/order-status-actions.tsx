'use client';

// Client island for the order-detail action bar. Renders only the buttons whose
// transition is LEGAL from the current status (gated by canTransition, the same
// pure predicate the server actions enforce), so the UI can't even offer an
// illegal move. Each button dispatches its server action inside a transition and
// surfaces inline errors; success re-renders via the action's revalidatePath.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { confirmOrder, shipOrder, deliverOrder, cancelOrder } from '@/lib/admin/order-actions';
import {
  canTransition,
  type AdminOrderStatus,
  type OrderActionResult,
} from '@/lib/admin/order-transitions';

interface Props {
  number: string;
  status: AdminOrderStatus;
}

type ActionKey = 'confirm' | 'ship' | 'deliver' | 'cancel';

// Each entry: the target status it moves to, ru label, and the action runner.
const ACTIONS: Record<
  ActionKey,
  {
    to: AdminOrderStatus;
    label: string;
    run: (number: string, reason?: string) => Promise<OrderActionResult>;
    danger?: boolean;
  }
> = {
  confirm: { to: 'confirmed', label: 'Подтвердить', run: (n) => confirmOrder(n) },
  ship: { to: 'shipped', label: 'Отправить', run: (n) => shipOrder(n) },
  deliver: { to: 'delivered', label: 'Доставлено', run: (n) => deliverOrder(n) },
  cancel: {
    to: 'canceled',
    label: 'Отменить',
    run: (n, reason) => cancelOrder(n, reason),
    danger: true,
  },
};

const ERROR_LABEL: Record<string, string> = {
  not_found: 'Заказ не найден',
  illegal_transition: 'Недопустимый переход статуса',
  invalid_number: 'Неверный номер заказа',
  invalid_reason: 'Неверная причина',
  unexpected: 'Произошла ошибка',
};

export function OrderStatusActions({ number, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<ActionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only show buttons whose move is legal from the current status.
  const available = (Object.entries(ACTIONS) as [ActionKey, (typeof ACTIONS)[ActionKey]][]).filter(
    ([, def]) => canTransition(status, def.to),
  );

  if (available.length === 0) {
    return (
      <p className="text-ink-muted text-xs dark:text-stone-400">
        Нет доступных действий (заказ в конечном статусе).
      </p>
    );
  }

  function dispatch(key: ActionKey) {
    const def = ACTIONS[key];
    setError(null);

    let reason: string | undefined;
    if (key === 'cancel') {
      const input = window.prompt('Причина отмены (необязательно):') ?? '';
      reason = input.trim() || undefined;
      // window.prompt returns null on Cancel — treat the *dialog* cancel as abort.
      if (input === null) return;
    }

    setBusyKey(key);
    startTransition(async () => {
      const result = await def.run(number, reason);
      setBusyKey(null);
      if (!result.ok) {
        setError(ERROR_LABEL[result.error] ?? result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {available.map(([key, def]) => {
          const isBusy = pending && busyKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => dispatch(key)}
              disabled={pending}
              className={
                'inline-flex h-10 items-center justify-center px-5 text-xs font-semibold tracking-widest uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50 ' +
                (def.danger
                  ? 'border border-rose-300 text-rose-700 hover:bg-rose-50'
                  : 'bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink')
              }
            >
              {isBusy ? '…' : def.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
