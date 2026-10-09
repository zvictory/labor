'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False in the server HTML and while React hydrates it, true from then on.
 *
 * A button rendered on the server does nothing until its click handler is
 * attached: on a slow phone, "add to cart" pressed in that window silently
 * did nothing. Buttons that only work through JavaScript stay disabled until
 * this turns true, so they look and are announced as not ready yet.
 */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
