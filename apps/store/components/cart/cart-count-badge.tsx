'use client';

// Header cart-icon badge. Fetches the cart count on mount and listens for cart
// updates broadcast by other islands (add-to-cart, mini-cart) so the number
// stays live without polling. Renders nothing while empty.

import { useEffect, useState } from 'react';

import type { CartDTO } from '@/lib/cart/cart';
import { onCartUpdated } from '@/components/cart/cart-events';

export function CartCountBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    fetch('/api/cart')
      .then((res) => (res.ok ? (res.json() as Promise<CartDTO>) : null))
      .then((cart) => {
        if (active && cart) setCount(cart.itemCount);
      })
      .catch(() => {
        /* badge stays hidden on failure */
      });

    const off = onCartUpdated((cart) => setCount(cart.itemCount));
    return () => {
      active = false;
      off();
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brass px-1 text-[10px] font-bold leading-none text-bone">
      {count > 99 ? '99+' : count}
    </span>
  );
}
