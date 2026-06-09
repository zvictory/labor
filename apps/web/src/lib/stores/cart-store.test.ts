import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cart-store';

describe('cart-store', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it('starts with an empty cart', () => {
    const state = useCartStore.getState();
    expect(state.lines).toEqual([]);
    expect(state.total()).toBe(0);
  });

  it('adds a new product line correctly', () => {
    const store = useCartStore.getState();
    store.addLine({
      product_id: 1,
      variant_id: 10,
      slug: 'rose-31',
      name: 'Rose 31',
      brand: 'Le Labo',
      volume_ml: 50,
      image: '/image.png',
      price: 1500000,
      quantity: 2,
    });

    const updated = useCartStore.getState();
    expect(updated.lines).toHaveLength(1);
    expect(updated.lines[0]).toEqual({
      product_id: 1,
      variant_id: 10,
      slug: 'rose-31',
      name: 'Rose 31',
      brand: 'Le Labo',
      volume_ml: 50,
      image: '/image.png',
      price: 1500000,
      quantity: 2,
    });
    expect(updated.total()).toBe(3000000);
  });

  it('increments quantity when adding the same variant again', () => {
    const store = useCartStore.getState();
    const line = {
      product_id: 1,
      variant_id: 10,
      slug: 'rose-31',
      name: 'Rose 31',
      brand: 'Le Labo',
      volume_ml: 50,
      image: '/image.png',
      price: 1500000,
      quantity: 2,
    };

    store.addLine(line);
    store.addLine({ ...line, quantity: 3 });

    const updated = useCartStore.getState();
    expect(updated.lines).toHaveLength(1);
    expect(updated.lines[0].quantity).toBe(5);
    expect(updated.total()).toBe(7500000);
  });

  it('sets variant quantity correctly', () => {
    const store = useCartStore.getState();
    store.addLine({
      product_id: 1,
      variant_id: 10,
      slug: 'rose-31',
      name: 'Rose 31',
      brand: 'Le Labo',
      volume_ml: 50,
      image: '/image.png',
      price: 1500000,
      quantity: 1,
    });

    store.setQuantity(10, 4);
    expect(useCartStore.getState().lines[0].quantity).toBe(4);

    store.setQuantity(10, 0); // Should remove from cart
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('removes variant from cart', () => {
    const store = useCartStore.getState();
    store.addLine({
      product_id: 1,
      variant_id: 10,
      slug: 'rose-31',
      name: 'Rose 31',
      brand: 'Le Labo',
      volume_ml: 50,
      image: '/image.png',
      price: 1500000,
      quantity: 1,
    });

    store.remove(10);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('clears cart correctly', () => {
    const store = useCartStore.getState();
    store.addLine({
      product_id: 1,
      variant_id: 10,
      slug: 'rose-31',
      name: 'Rose 31',
      brand: 'Le Labo',
      volume_ml: 50,
      image: '/image.png',
      price: 1500000,
      quantity: 1,
    });

    store.clear();
    expect(useCartStore.getState().lines).toHaveLength(0);
  });
});
