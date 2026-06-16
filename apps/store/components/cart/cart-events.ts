// Tiny client-side pub/sub so cart islands (header badge, mini-cart) refresh
// after a mutation made elsewhere on the page (add-to-cart button, cart page).
// Uses a window CustomEvent — no extra state library, SSR-safe (guards window).

import type { CartDTO } from '@/lib/cart/cart';

export const CART_UPDATED_EVENT = 'labor:cart-updated';

/** Broadcast a fresh cart snapshot to any listening islands. */
export const emitCartUpdated = (cart: CartDTO): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<CartDTO>(CART_UPDATED_EVENT, { detail: cart }));
};

/** Subscribe to cart updates. Returns an unsubscribe fn. */
export const onCartUpdated = (handler: (cart: CartDTO) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event): void => {
    handler((e as CustomEvent<CartDTO>).detail);
  };
  window.addEventListener(CART_UPDATED_EVENT, listener);
  return () => window.removeEventListener(CART_UPDATED_EVENT, listener);
};
