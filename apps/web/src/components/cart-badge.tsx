'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/stores/cart-store';

export function CartBadge() {
  const [mounted, setMounted] = useState(false);
  const cartCount = useCartStore((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || cartCount === 0) return null;

  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brass text-[9px] font-bold text-white transition-all duration-300 animate-in fade-in zoom-in">
      {cartCount}
    </span>
  );
}
