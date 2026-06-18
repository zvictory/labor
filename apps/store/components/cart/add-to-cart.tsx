'use client';

// Add-to-cart client island. Renders a primary "Add to cart" button and, when
// `hasSample`, a secondary "Sample" variant (sample = ~8% decant, priced
// server-side via lineUnitPrice). Posts to /api/cart, shows a transient inline
// toast, and broadcasts the fresh cart so the header badge / mini-cart update
// without a refetch. Falls back gracefully if the request fails.

import { useState, useTransition } from 'react';
import { ShoppingBag } from 'lucide-react';

import type { CartDTO } from '@/lib/cart/cart';
import { emitCartUpdated } from '@/components/cart/cart-events';

type Lang = 'ru' | 'uz' | 'en';

const ADD_COPY: Record<Lang, string> = {
  ru: 'В корзину',
  uz: 'Savatga',
  en: 'Add to cart',
};
const SAMPLE_COPY: Record<Lang, string> = {
  ru: 'Пробник',
  uz: 'Namuna',
  en: 'Sample',
};
const ADDED_COPY: Record<Lang, string> = {
  ru: 'Добавлено в корзину',
  uz: 'Savatga qoʻshildi',
  en: 'Added to cart',
};
const ERROR_COPY: Record<Lang, string> = {
  ru: 'Не удалось добавить',
  uz: 'Qoʻshib boʻlmadi',
  en: 'Could not add to cart',
};

const toLang = (locale: string): Lang =>
  locale === 'uz' || locale === 'en' ? locale : 'ru';

function useAddToCart(productId: number, locale: string) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const lang = toLang(locale);

  const add = (isSample: boolean): void => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/cart?locale=${locale}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId, isSample, quantity: 1 }),
        });
        if (!res.ok) throw new Error('request failed');
        const cart = (await res.json()) as CartDTO;
        emitCartUpdated(cart);
        setToast({ kind: 'ok', text: ADDED_COPY[lang] });
      } catch {
        setToast({ kind: 'err', text: ERROR_COPY[lang] });
      }
      window.setTimeout(() => setToast(null), 2500);
    });
  };

  return { pending, toast, add };
}

/**
 * Compact icon add-to-cart for the catalog card overlay. Rendered as a sibling
 * of the card's <Link> (never nested inside the anchor) so the markup stays
 * valid and the click doesn't trigger navigation. Full bottle only.
 */
export function AddToCartIcon({ productId, locale }: { productId: number; locale: string }) {
  const { pending, add } = useAddToCart(productId, locale);
  const lang = toLang(locale);
  return (
    <button
      type="button"
      aria-label={ADD_COPY[lang]}
      title={ADD_COPY[lang]}
      disabled={pending}
      onClick={() => add(false)}
      className="absolute bottom-2 right-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200/80 bg-white/95 text-stone-700 shadow-sm transition-all duration-300 hover:border-brass hover:bg-brass hover:text-white disabled:opacity-60 dark:border-stone-800 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:bg-brass dark:hover:text-bone"
    >
      <ShoppingBag className="h-4 w-4" />
    </button>
  );
}

export function AddToCart({
  productId,
  locale,
  hasSample = false,
}: {
  productId: number;
  locale: string;
  hasSample?: boolean;
}) {
  const lang = toLang(locale);
  const { pending, toast, add } = useAddToCart(productId, locale);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={pending}
          onClick={() => add(false)}
          className="inline-flex h-12 flex-1 items-center justify-center bg-ink px-7 text-xs font-semibold uppercase tracking-widest text-bone transition-colors hover:bg-brass disabled:cursor-not-allowed disabled:opacity-70 dark:bg-bone dark:text-ink"
        >
          {ADD_COPY[lang]}
        </button>
        {hasSample && (
          <button
            type="button"
            disabled={pending}
            onClick={() => add(true)}
            className="inline-flex h-12 items-center justify-center border border-ink px-7 text-xs font-semibold uppercase tracking-widest text-ink transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-70 dark:border-bone dark:text-bone"
          >
            {SAMPLE_COPY[lang]}
          </button>
        )}
      </div>
      {toast && (
        <p
          role="status"
          className={
            toast.kind === 'ok'
              ? 'text-xs text-emerald-600 dark:text-emerald-400'
              : 'text-xs text-red-600 dark:text-red-400'
          }
        >
          {toast.text}
        </p>
      )}
    </div>
  );
}
