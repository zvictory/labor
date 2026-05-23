import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProductCard } from '../api/products.js';

interface CompareState {
  items: ProductCard[];
  add: (p: ProductCard) => void;
  remove: (id: number) => void;
  clear: () => void;
  has: (id: number) => boolean;
}

export const MAX_COMPARE = 4;

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (p) => {
        const { items } = get();
        if (items.some((i) => i.id === p.id)) return;
        if (items.length >= MAX_COMPARE) return;
        set({ items: [...items, p] });
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      clear: () => set({ items: [] }),
      has: (id) => get().items.some((i) => i.id === id),
    }),
    { name: 'labor-compare' },
  ),
);
