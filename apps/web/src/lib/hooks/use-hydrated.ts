import { useSyncExternalStore } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';

type PersistApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (cb: () => void) => () => void;
};

interface HydratableStore<S> extends UseBoundStore<StoreApi<S>> {
  persist: PersistApi;
}

const SERVER_SNAPSHOT = false;

/**
 * Returns true once a Zustand `persist` middleware store has finished
 * rehydrating from storage. Uses `useSyncExternalStore` so SSR returns
 * `false` and the client value flips after hydration without tearing.
 */
export const useHydrated = <S,>(store: HydratableStore<S>): boolean => {
  return useSyncExternalStore(
    (cb) => store.persist.onFinishHydration(cb),
    () => store.persist.hasHydrated(),
    () => SERVER_SNAPSHOT,
  );
};
