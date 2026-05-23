'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCartStore } from '@/lib/stores/cart-store';
import { formatUzs } from '@/lib/format';

export const CartView = () => {
  const t = useTranslations('cart');
  const locale = useLocale();
  const lines = useCartStore((s) => s.lines);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const total = useCartStore((s) => s.total());

  if (lines.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-stone-600">{t('empty')}</p>
        <Link
          href={`/${locale}/catalog`}
          className="inline-block rounded-full bg-stone-900 px-6 py-3 text-sm uppercase tracking-widest text-white hover:bg-stone-800"
        >
          {t('emptyCta')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-stone-200 border-y border-stone-200">
        {lines.map((l) => (
          <li key={l.variant_id} className="flex gap-4 py-6">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-md bg-stone-50">
              <Image src={l.image} alt={l.name} fill sizes="112px" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-stone-500">{l.brand}</p>
                  <p className="text-base text-stone-900">{l.name}</p>
                  <p className="text-xs text-stone-500">{l.volume_ml} ml</p>
                  <p className="mt-1 text-sm text-stone-700">{formatUzs(l.price, locale)}</p>
                </div>
                <button
                  onClick={() => remove(l.variant_id)}
                  aria-label={t('remove')}
                  className="text-sm text-stone-500 hover:text-stone-900"
                >
                  {t('remove')}
                </button>
              </div>

              <div className="flex items-end justify-between">
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`qty-${l.variant_id}`}>
                    {t('quantity')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuantity(l.variant_id, l.quantity - 1)}
                    className="h-8 w-8 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100"
                    aria-label="-"
                  >
                    −
                  </button>
                  <input
                    id={`qty-${l.variant_id}`}
                    type="number"
                    inputMode="decimal"
                    min={1}
                    value={l.quantity}
                    onChange={(e) => {
                      const next = Number.parseInt(e.target.value, 10);
                      if (Number.isFinite(next)) setQuantity(l.variant_id, next);
                    }}
                    className="h-8 w-14 rounded-md border border-stone-300 bg-white px-2 text-center text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(l.variant_id, l.quantity + 1)}
                    className="h-8 w-8 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100"
                    aria-label="+"
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-widest text-stone-500">{t('itemTotal')}</p>
                  <p className="text-base font-medium text-stone-900">
                    {formatUzs(l.price * l.quantity, locale)}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-end gap-4">
        <div className="flex w-full max-w-sm items-baseline justify-between">
          <span className="text-sm uppercase tracking-widest text-stone-500">{t('subtotal')}</span>
          <span className="font-serif text-3xl text-stone-900">{formatUzs(total, locale)}</span>
        </div>
        <Link
          href={`/${locale}/checkout`}
          className="inline-block rounded-full bg-stone-900 px-8 py-3 text-sm uppercase tracking-widest text-white hover:bg-stone-800"
        >
          {t('proceed')}
        </Link>
      </div>
    </>
  );
};
