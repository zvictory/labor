'use client';

import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { toggleWishlist, useWishlist } from '@/components/wishlist/wishlist-store';

// The heart. `icon` is the 32 px square that sits on a catalogue card beside
// the cart button; `full` is the labelled version under the product page's
// add-to-cart.
export function WishlistButton({
  productId,
  variant = 'icon',
}: {
  productId: number;
  variant?: 'icon' | 'full';
}) {
  const t = useTranslations('wishlist');
  const { ready, ids } = useWishlist();
  const saved = ids.includes(productId);
  const label = saved ? t('remove') : t('add');

  const heart = (
    <Heart
      className={variant === 'icon' ? 'h-3.5 w-3.5' : 'h-4 w-4'}
      strokeWidth={1.5}
      fill={saved ? 'currentColor' : 'none'}
      aria-hidden="true"
    />
  );

  if (variant === 'icon') {
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={saved}
        title={label}
        disabled={!ready}
        onClick={() => void toggleWishlist(productId)}
        className="border-hairline bg-background text-foreground hover:bg-foreground hover:text-background dark:border-gunmetal inline-flex h-8 w-8 items-center justify-center border transition-colors disabled:opacity-60"
      >
        {heart}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={!ready}
      onClick={() => void toggleWishlist(productId)}
      className="text-foreground inline-flex items-center gap-2 self-start text-xs font-medium underline-offset-4 hover:underline disabled:opacity-60"
    >
      {heart}
      {saved ? t('saved') : t('add')}
    </button>
  );
}
