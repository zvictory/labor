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

export function PdpStickyBar({ productId, name, brand, price, image, locale }: PdpStickyBarProps) {
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
    // A flat bar with a hairline on top, never a raised one. It repeats the
    // decision the page already offers, so it must not read as a second, louder
    // interface floating over the first.
    <div className="border-border bg-background fixed right-0 bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 z-30 flex items-center justify-between gap-4 border-t px-4 py-2.5 md:hidden">
      <div className="flex min-w-0 items-center gap-3">
        {image && (
          <div className="border-border relative h-10 w-10 shrink-0 overflow-hidden border p-0.5">
            <Image
              src={image}
              alt={name}
              fill
              sizes="40px"
              className="object-contain mix-blend-multiply dark:mix-blend-normal"
            />
          </div>
        )}
        <div className="min-w-0 leading-tight">
          <p className="text-muted-foreground text-micro truncate font-mono tracking-[0.16em] uppercase">
            {brand}
          </p>
          <h4 className="truncate text-xs font-semibold tracking-[-0.01em]">{name}</h4>
          <p className="mt-0.5 font-mono text-xs font-semibold">{formatUzs(price, locale)}</p>
        </div>
      </div>
      <button
        onClick={handleAdd}
        disabled={pending}
        className="bg-foreground text-background text-micro flex h-10 shrink-0 items-center justify-center gap-1.5 px-5 font-semibold tracking-[0.16em] uppercase transition-opacity hover:opacity-80 disabled:opacity-60"
      >
        {pending ? (
          <span className="border-background h-3 w-3 animate-spin border border-t-transparent" />
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
