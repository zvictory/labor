'use client';

// Mini-cart drawer client island. Opens from the header, fetches /api/cart on
// open, listens for cart updates, and supports qty steppers + remove via the
// JSON API. Subtotal only (delivery is added at checkout). The checkout CTA
// links to /${locale}/checkout (owned by Agent B).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, X, Minus, Plus, Trash2 } from 'lucide-react';

import type { CartDTO } from '@/lib/cart/cart';
import { formatUzs } from '@/lib/money';
import { emitCartUpdated, onCartUpdated } from '@/components/cart/cart-events';

type Lang = 'ru' | 'uz' | 'en';
const toLang = (locale: string): Lang =>
  locale === 'uz' || locale === 'en' ? locale : 'ru';

const COPY: Record<Lang, { title: string; empty: string; subtotal: string; checkout: string; sample: string; close: string }> = {
  ru: { title: 'Корзина', empty: 'Корзина пуста', subtotal: 'Подытог', checkout: 'Оформить заказ', sample: 'Пробник', close: 'Закрыть' },
  uz: { title: 'Savat', empty: 'Savat boʻsh', subtotal: 'Oraliq summa', checkout: 'Buyurtma berish', sample: 'Namuna', close: 'Yopish' },
  en: { title: 'Cart', empty: 'Your cart is empty', subtotal: 'Subtotal', checkout: 'Checkout', sample: 'Sample', close: 'Close' },
};

export function MiniCart({ locale }: { locale: string }) {
  const lang = toLang(locale);
  const copy = COPY[lang];
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cart?locale=${locale}`);
      if (res.ok) setCart((await res.json()) as CartDTO);
    } catch {
      /* keep last good state */
    }
  }, [locale]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => onCartUpdated((next) => setCart(next)), []);

  const mutate = async (
    method: 'PATCH' | 'DELETE',
    body: Record<string, number>,
  ): Promise<void> => {
    setBusy(true);
    try {
      const res = await fetch(`/api/cart?locale=${locale}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const next = (await res.json()) as CartDTO;
        setCart(next);
        emitCartUpdated(next);
      }
    } finally {
      setBusy(false);
    }
  };

  const setQty = (itemId: number, quantity: number) => mutate('PATCH', { itemId, quantity });
  const remove = (itemId: number) => mutate('DELETE', { itemId });

  return (
    <>
      <button
        type="button"
        aria-label={copy.title}
        onClick={() => setOpen(true)}
        className="relative p-2 hover:text-brass"
      >
        <ShoppingBag className="h-5 w-5" />
        {cart && cart.itemCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brass px-1 text-[10px] font-bold leading-none text-bone">
            {cart.itemCount > 99 ? '99+' : cart.itemCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label={copy.close}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <aside
            role="dialog"
            aria-label={copy.title}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-xl"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-2xl text-ink dark:text-bone">{copy.title}</h2>
              <button
                type="button"
                aria-label={copy.close}
                onClick={() => setOpen(false)}
                className="p-2 hover:text-brass"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!cart || cart.items.length === 0 ? (
                <p className="py-16 text-center text-sm text-ink-muted dark:text-stone-400">
                  {copy.empty}
                </p>
              ) : (
                <ul className="space-y-5">
                  {cart.items.map((line) => (
                    <li key={line.id} className="flex gap-3">
                      <Link
                        href={`/${locale}/product/${line.slug}`}
                        onClick={() => setOpen(false)}
                        className="relative h-20 w-16 shrink-0 overflow-hidden rounded bg-stone-50"
                      >
                        {line.image && (
                          <Image
                            src={line.image}
                            alt={line.name}
                            fill
                            sizes="64px"
                            className="object-contain p-1"
                          />
                        )}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {line.brand && (
                              <p className="truncate text-[10px] uppercase tracking-widest text-stone-500">
                                {line.brand}
                              </p>
                            )}
                            <p className="truncate text-sm text-ink dark:text-bone">{line.name}</p>
                            {line.isSample && (
                              <span className="mt-0.5 inline-block rounded bg-stone-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                                {copy.sample}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            aria-label="remove"
                            disabled={busy}
                            onClick={() => remove(line.id)}
                            className="p-1 text-stone-400 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <div className="inline-flex items-center rounded border border-border">
                            <button
                              type="button"
                              aria-label="decrease"
                              disabled={busy}
                              onClick={() => setQty(line.id, line.quantity - 1)}
                              className="px-2 py-1 hover:text-brass disabled:opacity-50"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-6 text-center text-sm tabular-nums">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="increase"
                              disabled={busy}
                              onClick={() => setQty(line.id, line.quantity + 1)}
                              className="px-2 py-1 hover:text-brass disabled:opacity-50"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-medium text-ink dark:text-bone">
                            {formatUzs(line.lineTotal, locale)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cart && cart.items.length > 0 && (
              <footer className="border-t border-border px-5 py-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-ink-muted dark:text-stone-400">{copy.subtotal}</span>
                  <span className="text-lg font-medium text-ink dark:text-bone">
                    {formatUzs(cart.subtotal, locale)}
                  </span>
                </div>
                <Link
                  href={`/${locale}/checkout`}
                  onClick={() => setOpen(false)}
                  className="inline-flex h-12 w-full items-center justify-center bg-ink text-xs font-semibold uppercase tracking-widest text-bone transition-colors hover:bg-brass dark:bg-bone dark:text-ink"
                >
                  {copy.checkout}
                </Link>
              </footer>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
