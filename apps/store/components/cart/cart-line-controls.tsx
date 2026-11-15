'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';

import { updateCartItemAction, removeCartItemAction } from '@/lib/cart/actions';
import { emitCartUpdated } from '@/components/cart/cart-events';
import { useHydrated } from '@/lib/use-hydrated';
import type { CartDTO } from '@/lib/cart/cart';

export function CartLineControls({
  itemId,
  quantity,
  locale,
  itemLabel,
}: {
  itemId: number;
  quantity: number;
  locale: string;
  itemLabel: string;
}) {
  const t = useTranslations('cart');
  const [transitionPending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);
  const hydrated = useHydrated();
  const pending = transitionPending || !hydrated;
  const revalidate = `/${locale}/cart`;
  const controlClass =
    'inline-flex size-11 shrink-0 items-center justify-center hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40';

  const mutate = (action: () => Promise<CartDTO>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setFailed(false);
    startTransition(async () => {
      try {
        emitCartUpdated(await action());
      } catch {
        setFailed(true);
      } finally {
        inFlight.current = false;
      }
    });
  };

  return (
    <div className="space-y-1" aria-busy={transitionPending}>
      <div className="flex flex-wrap items-center gap-x-4">
        <div
          className="border-border inline-flex h-11 items-center border"
          role="group"
          aria-label={t('quantityFor', { item: itemLabel })}
        >
          <button
            type="button"
            aria-label={t('decrease', { item: itemLabel })}
            disabled={pending || quantity <= 1}
            onClick={() => mutate(() => updateCartItemAction(itemId, quantity - 1, revalidate))}
            className={controlClass}
          >
            <Minus aria-hidden="true" className="size-3.5" />
          </button>
          <span className="min-w-6 text-center font-mono text-sm" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label={t('increase', { item: itemLabel })}
            disabled={pending}
            onClick={() => mutate(() => updateCartItemAction(itemId, quantity + 1, revalidate))}
            className={controlClass}
          >
            <Plus aria-hidden="true" className="size-3.5" />
          </button>
        </div>
        <button
          type="button"
          aria-label={t('removeItem', { item: itemLabel })}
          disabled={pending}
          onClick={() => mutate(() => removeCartItemAction(itemId, revalidate))}
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-xs underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        >
          {t('remove')}
        </button>
      </div>
      {failed ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {t('updateError')}
        </p>
      ) : null}
    </div>
  );
}
