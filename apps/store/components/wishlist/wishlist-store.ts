'use client';

// One wishlist state for every heart on the page.
//
// Signed in, the list lives in the database (/api/wishlist). A guest's list
// lives in localStorage, so saving a product never asks for a login. The first
// page load after signing in finds both, hands the browser list to the account
// (PUT /api/wishlist) and clears it — the same way the guest cart is folded in.

import { useEffect, useSyncExternalStore } from 'react';

import { track } from '@/lib/analytics';

export type WishlistSnapshot = { ready: boolean; ids: readonly number[] };

const STORAGE_KEY = 'labor:wishlist';
const LIMIT = 200;
const SERVER_SNAPSHOT: WishlistSnapshot = { ready: false, ids: [] };

let state: WishlistSnapshot = SERVER_SNAPSHOT;
let signedIn = false;
let started = false;
const listeners = new Set<() => void>();

const emit = (next: WishlistSnapshot): void => {
  state = next;
  listeners.forEach((listener) => listener());
};

/** Product ids from a stored string; anything malformed reads as an empty list. */
export const parseStoredIds = (raw: string | null): number[] => {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const ids = value.filter((v): v is number => Number.isInteger(v) && v > 0);
    return [...new Set(ids)].slice(0, LIMIT);
  } catch {
    return [];
  }
};

const readLocal = (): number[] => {
  try {
    return parseStoredIds(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
};

const writeLocal = (ids: readonly number[]): void => {
  try {
    if (ids.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage blocked: the list lasts for this page only.
  }
};

const request = async (method: 'POST' | 'DELETE' | 'PUT', body: unknown): Promise<number[] | null> => {
  try {
    const res = await fetch('/api/wishlist', {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ids?: unknown };
    return Array.isArray(data.ids) ? parseStoredIds(JSON.stringify(data.ids)) : null;
  } catch {
    return null;
  }
};

const start = async (): Promise<void> => {
  if (started) return;
  started = true;
  const local = readLocal();
  try {
    const res = await fetch('/api/wishlist', { cache: 'no-store' });
    const { ids } = (await res.json()) as { ids: number[] | null };
    if (!Array.isArray(ids)) {
      emit({ ready: true, ids: local });
      return;
    }
    signedIn = true;
    if (local.length > 0) {
      const merged = await request('PUT', { productIds: local });
      if (merged) {
        writeLocal([]);
        emit({ ready: true, ids: merged });
        return;
      }
    }
    emit({ ready: true, ids });
  } catch {
    emit({ ready: true, ids: local });
  }
};

/** Save or unsave a product. Optimistic; a failed save is rolled back. */
export const toggleWishlist = async (productId: number): Promise<void> => {
  const before = state.ids;
  const saved = before.includes(productId);
  const next = saved ? before.filter((id) => id !== productId) : [productId, ...before];
  emit({ ...state, ids: next });
  if (!saved) track('add_to_wishlist', { item_id: String(productId) });

  if (!signedIn) {
    writeLocal(next);
    return;
  }
  const ids = await request(saved ? 'DELETE' : 'POST', { productId });
  emit({ ...state, ids: ids ?? before });
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useWishlist = (): WishlistSnapshot => {
  useEffect(() => {
    void start();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_SNAPSHOT,
  );
};
