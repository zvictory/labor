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
const toLang = (locale: string): Lang => (locale === 'uz' || locale === 'en' ? locale : 'ru');

const COPY: Record<
  Lang,
  {
    title: string;
    empty: string;
    subtotal: string;
    checkout: string;
    sample: string;
    close: string;
  }
> = {
  ru: {
    title: 'Корзина',
    empty: 'Корзина пуста',
    subtotal: 'Подытог',
    checkout: 'Оформить заказ',
    sample: 'Пробник',
    close: 'Закрыть',
  },
  uz: {
    title: 'Savat',
    empty: 'Savat boʻsh',
    subtotal: 'Oraliq summa',
    checkout: 'Buyurtma berish',
    sample: 'Namuna',
    close: 'Yopish',
  },
  en: {
    title: 'Cart',
    empty: 'Your cart is empty',
    subtotal: 'Subtotal',
    checkout: 'Checkout',
    sample: 'Sample',
    close: 'Close',
  },
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
        className="relative p-2 hover:underline hover:underline-offset-4"
      >
        <ShoppingBag className="h-5 w-5" />
        {cart && cart.itemCount > 0 && (
          <span className="bg-foreground text-micro text-background absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center px-1 font-mono leading-none">
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
            className="bg-graphite/50 absolute inset-0"
          />
          {/* A flat scrim and a hairline, not a blur and a drop shadow: the
              drawer is a panel that slid over the page, not one floating above
              it. `shadow-xl` resolves to none in this system, so the left edge
              is what separates the drawer from what it covers. */}
          <aside
            role="dialog"
            aria-label={copy.title}
            className="bg-background border-border absolute top-0 right-0 flex h-full w-full max-w-md flex-col border-l"
          >
            <header className="border-border flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-display text-ink dark:text-bone text-2xl">{copy.title}</h2>
              <button
                type="button"
                aria-label={copy.close}
                onClick={() => setOpen(false)}
                className="p-2 hover:underline hover:underline-offset-4"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!cart || cart.items.length === 0 ? (
                <p className="text-ink-muted py-16 text-center text-sm dark:text-stone-400">
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
                              <p className="text-micro truncate tracking-widest text-stone-500 uppercase">
                                {line.brand}
                              </p>
                            )}
                            <p className="text-ink dark:text-bone truncate text-sm">{line.name}</p>
                            {line.isSample && (
                              <span className="text-micro mt-0.5 inline-block rounded bg-stone-100 px-1.5 py-0.5 tracking-wide text-stone-600 uppercase dark:bg-stone-800 dark:text-stone-300">
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
                          <div className="border-border inline-flex items-center rounded border">
                            <button
                              type="button"
                              aria-label="decrease"
                              disabled={busy}
                              onClick={() => setQty(line.id, line.quantity - 1)}
                              className="px-2 py-1 hover:underline hover:underline-offset-4 disabled:opacity-50"
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
                              className="px-2 py-1 hover:underline hover:underline-offset-4 disabled:opacity-50"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-ink dark:text-bone text-sm font-medium">
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
              <footer className="border-border border-t px-5 py-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-ink-muted dark:text-stone-400">{copy.subtotal}</span>
                  <span className="text-ink dark:text-bone text-lg font-medium">
                    {formatUzs(cart.subtotal, locale)}
                  </span>
                </div>
                <Link
                  href={`/${locale}/checkout`}
                  onClick={() => setOpen(false)}
                  className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-12 w-full items-center justify-center text-xs font-semibold tracking-widest uppercase transition-colors"
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
