'use server';

// Server Actions wrapping the cart access layer. Each revalidates the cart page
// plus a caller-supplied path (typically the page the action was invoked from,
// e.g. a PDP) so server-rendered cart UI refreshes after a mutation.

import { revalidatePath } from 'next/cache';

import { addItem, updateItem, removeItem, type AddItemOptions, type CartDTO } from '@/lib/cart/cart';

const revalidateCart = (revalidate?: string): void => {
  // The cart page is locale-prefixed; revalidate the layout tree so every
  // locale variant + the header badge picks up the change.
  revalidatePath('/[locale]/cart', 'page');
  if (revalidate) {
    revalidatePath(revalidate);
  }
};

export const addToCartAction = async (
  productId: number,
  options: AddItemOptions = {},
  revalidate?: string,
): Promise<CartDTO> => {
  const cart = await addItem(productId, options);
  revalidateCart(revalidate);
  return cart;
};

export const updateCartItemAction = async (
  itemId: number,
  quantity: number,
  revalidate?: string,
): Promise<CartDTO> => {
  const cart = await updateItem(itemId, quantity);
  revalidateCart(revalidate);
  return cart;
};

export const removeCartItemAction = async (
  itemId: number,
  revalidate?: string,
): Promise<CartDTO> => {
  const cart = await removeItem(itemId);
  revalidateCart(revalidate);
  return cart;
};
