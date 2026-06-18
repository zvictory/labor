'use client';

import { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { formatUzs } from '@/lib/money';
import { emitCartUpdated } from '@/components/cart/cart-events';
import type { CartDTO } from '@/lib/cart/cart';

interface PdpStickyBarProps {
  productId: number;
  slug: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  locale: string;
}

export function PdpStickyBar({
  productId,
  name,
  brand,
  price,
  image,
  locale,
}: PdpStickyBarProps) {
  const [visible, setVisible] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const handleScroll = () => {
      // Show buy bar when scrolled past typical fold (450px)
      if (window.scrollY > 450) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  const handleAdd = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/cart?locale=${locale}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId, isSample: false, quantity: 1 }),
        });
        if (!res.ok) throw new Error('Add failed');
        const cart = (await res.json()) as CartDTO;
        emitCartUpdated(cart);
      } catch (e) {
        console.error('Sticky buy bar error:', e);
      }
    });
  };

  const buyText = locale === 'ru' ? 'В корзину' : locale === 'uz' ? 'Savatga' : 'Add to cart';

  return (
    <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 z-30 border-t border-stone-200/80 bg-white/95 px-4 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] backdrop-blur-md dark:border-stone-850 dark:bg-stone-900/95 flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-300 md:hidden">
      <div className="flex items-center gap-3 min-w-0">
        {image && (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-stone-50 border border-stone-100 p-0.5">
            <Image src={image} alt={name} fill className="object-contain" />
          </div>
        )}
        <div className="min-w-0 leading-tight">
          <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold truncate">{brand}</p>
          <h4 className="text-xs text-stone-900 dark:text-stone-100 font-medium truncate">{name}</h4>
          <p className="text-xs font-semibold text-brass mt-0.5">{formatUzs(price, locale)}</p>
        </div>
      </div>
      <button
        onClick={handleAdd}
        disabled={pending}
        className="flex h-10 items-center justify-center gap-1.5 bg-ink text-bone dark:bg-bone dark:text-ink text-[10px] font-bold uppercase tracking-wider px-5 shrink-0 transition-colors hover:bg-brass disabled:opacity-60"
      >
        {pending ? (
          <span className="h-3 w-3 animate-spin rounded-full border border-bone border-t-transparent" />
        ) : (
          <>
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>{buyText}</span>
          </>
        )}
      </button>
    </div>
  );
}
