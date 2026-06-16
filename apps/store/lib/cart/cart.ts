// Server-side cart access for Labor Parfum.
//
// Guest carts are keyed by a uuid `token` stored in an httpOnly cookie
// (`labor_cart`). The server resolves-or-creates a Cart by that token. When an
// authenticated session lands later, the userId should be attached and any
// pre-existing guest cart merged — see the user-merge TODO in getOrCreateCart().
//
// Money is integer UZS minor units. A sample/decant is priced at ~8% of the
// product price (matches the prototype): see lineUnitPrice().

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';

import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';

export const CART_COOKIE = 'labor_cart';

// One year — guest carts persist across visits.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const SAMPLE_PRICE_RATIO = 0.08;

/**
 * Unit price for a cart line. A sample/decant costs ~8% of the full price,
 * rounded to whole UZS minor units; a full bottle costs the product price.
 */
export const lineUnitPrice = (product: { price: number }, isSample: boolean): number =>
  isSample ? Math.round(product.price * SAMPLE_PRICE_RATIO) : product.price;

// ── cookie helpers ──────────────────────────────────────────────────────────

/** Current cart token from the request cookie, or null if none set yet. */
export const getCartToken = async (): Promise<string | null> => {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
};

/** Persist the cart token as an httpOnly cookie. */
export const setCartToken = async (token: string): Promise<void> => {
  const store = await cookies();
  store.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
};

// ── DTOs ─────────────────────────────────────────────────────────────────────

/** A single resolved cart line for the UI/API. */
export interface CartLineDTO {
  id: number;
  productId: number;
  slug: string;
  name: string;
  brand: string;
  image: string;
  quantity: number;
  isSample: boolean;
  unitPrice: number;
  lineTotal: number;
}

/** The cart projection consumed by the cart page, mini-cart and the API. */
export interface CartDTO {
  items: CartLineDTO[];
  itemCount: number;
  subtotal: number;
}

// ── cart row shape (items + product + first image) ───────────────────────────

const cartInclude = {
  items: {
    orderBy: { id: 'asc' },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          price: true,
          images: {
            orderBy: { position: 'asc' },
            take: 1,
            select: { url: true },
          },
          fragrance: {
            select: { brand: { select: { name: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

// ── core access ──────────────────────────────────────────────────────────────

/**
 * Resolve the numeric session userId without a static import of the auth module.
 *
 * cart.ts is imported by lib/auth/config.ts (for mergeGuestCartIntoUser); a
 * static `import { getCurrentUserId } from '@/lib/auth/session'` here would form
 * a cycle (cart → session → auth → config → cart). A lazy dynamic import keeps
 * the dependency one-directional at module-eval time. Returns undefined for
 * guests or if auth isn't available in this context.
 */
const resolveSessionUserId = async (): Promise<number | undefined> => {
  try {
    const { getCurrentUserId } = await import('@/lib/auth/session');
    return await getCurrentUserId();
  } catch {
    return undefined;
  }
};

/**
 * Merge the items of `from` into `into`, summing quantities on the unique
 * (cartId, productId, isSample) key, then delete the now-empty source cart.
 * Idempotent: a missing/empty source is a no-op. Returns nothing — callers
 * re-read the destination cart.
 */
const mergeCarts = async (fromCartId: number, intoCartId: number): Promise<void> => {
  if (fromCartId === intoCartId) return;

  const sourceItems = await db.cartItem.findMany({
    where: { cartId: fromCartId },
    select: { productId: true, isSample: true, quantity: true },
  });

  for (const item of sourceItems) {
    const existing = await db.cartItem.findUnique({
      where: {
        cartId_productId_isSample: {
          cartId: intoCartId,
          productId: item.productId,
          isSample: item.isSample,
        },
      },
      select: { id: true, quantity: true },
    });

    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
    } else {
      await db.cartItem.create({
        data: {
          cartId: intoCartId,
          productId: item.productId,
          isSample: item.isSample,
          quantity: item.quantity,
        },
      });
    }
  }

  // Source cart consumed — drop it (CartItem rows cascade on delete).
  await db.cart.delete({ where: { id: fromCartId } });
};

/**
 * Fold the visitor's current guest cart (resolved from the cookie token) into
 * `userId`'s cart, summing quantities on the unique key. Called on sign-in
 * (Auth.js events.signIn) so the basket survives login.
 *
 * - If the user has no cart yet, the guest cart is simply re-owned (userId set).
 * - If both exist, items merge into the user cart and the guest cart is deleted.
 * - The guest cookie token is left in place; it now resolves (via userId) to the
 *   user's cart on the next getOrCreateCart, or a fresh guest cart is minted.
 */
export const mergeGuestCartIntoUser = async (userId: number): Promise<void> => {
  const token = await getCartToken();

  const guestCart = token
    ? await db.cart.findUnique({ where: { token }, select: { id: true, userId: true } })
    : null;

  const userCart = await db.cart.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (!guestCart) {
    return; // nothing to merge
  }

  // Guest cart already belongs to this user — nothing to do.
  if (guestCart.userId === userId) {
    return;
  }

  if (!userCart) {
    // No user cart yet: just claim the guest cart for the user.
    await db.cart.update({ where: { id: guestCart.id }, data: { userId } });
    return;
  }

  await mergeCarts(guestCart.id, userCart.id);
};

/**
 * Resolve the caller's cart, creating one (and setting the cookie) if needed.
 * Returns the cart with its items, each item's product, and the product's first
 * image — ready to project into a CartDTO.
 *
 * When an authenticated session exists, the user's cart is preferred: any guest
 * cart referenced by the cookie token is merged into it first (matching on
 * productId+isSample, summing quantities), so login never loses the basket.
 */
export const getOrCreateCart = async (): Promise<CartWithItems> => {
  const token = await getCartToken();
  const userId = await resolveSessionUserId();

  if (userId !== undefined) {
    // Authenticated: fold any guest cart in, then prefer the user's cart.
    await mergeGuestCartIntoUser(userId);

    const userCart = await db.cart.findFirst({
      where: { userId },
      include: cartInclude,
      orderBy: { id: 'asc' },
    });
    if (userCart) {
      return userCart;
    }

    // No cart at all for this user yet — create one owned by them.
    const newToken = token ?? randomUUID();
    const created = await db.cart.create({
      data: { token: newToken, userId },
      include: cartInclude,
    });
    if (!token) {
      await setCartToken(newToken);
    }
    return created;
  }

  // Guest path.
  if (token) {
    const existing = await db.cart.findUnique({
      where: { token },
      include: cartInclude,
    });
    if (existing) {
      return existing;
    }
  }

  const newToken = randomUUID();
  const created = await db.cart.create({
    data: { token: newToken },
    include: cartInclude,
  });
  await setCartToken(newToken);
  return created;
};

const toCartLine = (
  item: CartWithItems['items'][number],
  locale: string,
): CartLineDTO => {
  const unitPrice = lineUnitPrice(item.product, item.isSample);
  return {
    id: item.id,
    productId: item.productId,
    slug: item.product.slug,
    name: resolveLocaleText(item.product.name, locale),
    brand: item.product.fragrance?.brand?.name ?? '',
    image: item.product.images[0]?.url ?? '',
    quantity: item.quantity,
    isSample: item.isSample,
    unitPrice,
    lineTotal: unitPrice * item.quantity,
  };
};

const projectCart = (cart: CartWithItems, locale: string): CartDTO => {
  const items = cart.items.map((item) => toCartLine(item, locale));
  return {
    items,
    itemCount: items.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: items.reduce((sum, line) => sum + line.lineTotal, 0),
  };
};

/** Read-only cart projection for the given locale. Creates a cart if needed. */
export const getCart = async (locale: string): Promise<CartDTO> => {
  const cart = await getOrCreateCart();
  return projectCart(cart, locale);
};

// ── mutations ─────────────────────────────────────────────────────────────────

export interface AddItemOptions {
  isSample?: boolean;
  quantity?: number;
}

/**
 * Add a product to the cart (upsert on cartId+productId+isSample). A non-positive
 * resulting quantity removes the line. Returns the updated CartDTO (ru-resolved;
 * callers that need a different locale should re-read via getCart).
 */
export const addItem = async (
  productId: number,
  options: AddItemOptions = {},
): Promise<CartDTO> => {
  const cart = await getOrCreateCart();
  const isSample = options.isSample ?? false;
  const quantity = options.quantity ?? 1;

  const existing = await db.cartItem.findUnique({
    where: {
      cartId_productId_isSample: { cartId: cart.id, productId, isSample },
    },
    select: { id: true, quantity: true },
  });

  const nextQuantity = (existing?.quantity ?? 0) + quantity;

  if (nextQuantity <= 0) {
    if (existing) {
      await db.cartItem.delete({ where: { id: existing.id } });
    }
  } else if (existing) {
    await db.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQuantity },
    });
  } else {
    await db.cartItem.create({
      data: { cartId: cart.id, productId, isSample, quantity: nextQuantity },
    });
  }

  return getCart('ru');
};

/**
 * Set an item's absolute quantity. quantity<=0 removes it. Scoped to the
 * caller's cart so a stray itemId from another cart cannot be mutated.
 */
export const updateItem = async (itemId: number, quantity: number): Promise<CartDTO> => {
  const cart = await getOrCreateCart();
  const item = cart.items.find((i) => i.id === itemId);

  if (item) {
    if (quantity <= 0) {
      await db.cartItem.delete({ where: { id: itemId } });
    } else {
      await db.cartItem.update({ where: { id: itemId }, data: { quantity } });
    }
  }

  return getCart('ru');
};

/** Remove a single line from the caller's cart. */
export const removeItem = async (itemId: number): Promise<CartDTO> => {
  const cart = await getOrCreateCart();
  const item = cart.items.find((i) => i.id === itemId);
  if (item) {
    await db.cartItem.delete({ where: { id: itemId } });
  }
  return getCart('ru');
};

/** Empty the caller's cart (used by checkout after an order is placed). */
export const clearCart = async (): Promise<void> => {
  const cart = await getOrCreateCart();
  await db.cartItem.deleteMany({ where: { cartId: cart.id } });
};
