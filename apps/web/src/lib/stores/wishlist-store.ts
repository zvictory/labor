import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  ids: number[];
  toggle: (id: number) => void;
  has: (id: number) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const { ids } = get();
        set({ ids: ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id] });
      },
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
    }),
    { name: 'labor-wishlist' },
  ),
);
