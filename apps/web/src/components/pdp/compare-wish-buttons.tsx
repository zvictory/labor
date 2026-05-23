'use client';

import { useTranslations } from 'next-intl';
import { useCompareStore, MAX_COMPARE } from '@/lib/stores/compare-store';
import { useWishlistStore } from '@/lib/stores/wishlist-store';
import type { ProductCard } from '@/lib/api/products';

export const CompareWishButtons = ({ card }: { card: ProductCard }) => {
  const t = useTranslations('pdp.actions');
  const inCompare = useCompareStore((s) => s.has(card.id));
  const compareItems = useCompareStore((s) => s.items);
  const addToCompare = useCompareStore((s) => s.add);
  const removeFromCompare = useCompareStore((s) => s.remove);

  const inWish = useWishlistStore((s) => s.has(card.id));
  const toggleWish = useWishlistStore((s) => s.toggle);

  const compareFull = compareItems.length >= MAX_COMPARE && !inCompare;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => toggleWish(card.id)}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
          inWish ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'
        }`}
        aria-pressed={inWish}
      >
        <span aria-hidden>{inWish ? '♥' : '♡'}</span>
        {inWish ? t('inWishlist') : t('addToWishlist')}
      </button>

      <button
        type="button"
        onClick={() => (inCompare ? removeFromCompare(card.id) : addToCompare(card))}
        disabled={compareFull}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition disabled:opacity-40 ${
          inCompare ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'
        }`}
        aria-pressed={inCompare}
        title={compareFull ? t('compareFull', { max: MAX_COMPARE }) : undefined}
      >
        ⇄ {inCompare ? t('inCompare') : t('addToCompare')}
      </button>
    </div>
  );
};
