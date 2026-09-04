'use client';

// Quantity stepper + remove control for a single line on the full cart page.
// Invokes the cart Server Actions (updateCartItemAction / removeCartItemAction)
// inside a transition; the actions revalidatePath('/[locale]/cart') so the RSC
// page re-renders with fresh totals. Also broadcasts so header/mini-cart stay
// in sync within the same navigation.

import { useTransition } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

import { updateCartItemAction, removeCartItemAction } from '@/lib/cart/actions';
import { emitCartUpdated } from '@/components/cart/cart-events';

export function CartLineControls({
  itemId,
  quantity,
  locale,
  removeLabel,
}: {
  itemId: number;
  quantity: number;
  locale: string;
  removeLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const revalidate = `/${locale}/cart`;

  const setQty = (next: number): void => {
    startTransition(async () => {
      const cart = await updateCartItemAction(itemId, next, revalidate);
      emitCartUpdated(cart);
    });
  };

  const remove = (): void => {
    startTransition(async () => {
      const cart = await removeCartItemAction(itemId, revalidate);
      emitCartUpdated(cart);
    });
  };

  return (
    <div className="flex items-center gap-4">
      <div className="border-border inline-flex items-center rounded border">
        <button
          type="button"
          aria-label="decrease"
          disabled={pending}
          onClick={() => setQty(quantity - 1)}
          className="px-2.5 py-1.5 hover:underline hover:underline-offset-4 disabled:opacity-50"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-7 text-center text-sm tabular-nums">{quantity}</span>
        <button
          type="button"
          aria-label="increase"
          disabled={pending}
          onClick={() => setQty(quantity + 1)}
          className="px-2.5 py-1.5 hover:underline hover:underline-offset-4 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-red-600 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {removeLabel}
      </button>
    </div>
  );
}
