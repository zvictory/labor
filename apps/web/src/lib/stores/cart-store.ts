import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartLine {
  product_id: number;
  variant_id: number;
  slug: string;
  name: string;
  brand: string;
  volume_ml: number;
  image: string;
  price: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  orderNumber: string | null;
  addLine: (line: CartLine) => void;
  setQuantity: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      orderNumber: null,
      addLine: (line) => {
        const existing = get().lines.find((l) => l.variant_id === line.variant_id);
        if (existing) {
          set({
            lines: get().lines.map((l) =>
              l.variant_id === line.variant_id ? { ...l, quantity: l.quantity + line.quantity } : l,
            ),
          });
        } else {
          set({ lines: [...get().lines, line] });
        }
      },
      setQuantity: (variantId, qty) => {
        if (qty <= 0) {
          set({ lines: get().lines.filter((l) => l.variant_id !== variantId) });
          return;
        }
        set({
          lines: get().lines.map((l) => (l.variant_id === variantId ? { ...l, quantity: qty } : l)),
        });
      },
      remove: (variantId) => set({ lines: get().lines.filter((l) => l.variant_id !== variantId) }),
      clear: () => set({ lines: [], orderNumber: null }),
      total: () => get().lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    }),
    { name: 'labor-cart' },
  ),
);
