// Order creation from the active cart. This is the single write path that turns
// a cart snapshot into a persisted Order + OrderItems, honoring the shared
// order contract that Agent C's payment webhooks depend on:
//
//   new Order  → status 'pending', paymentStatus 'unpaid'
//   Order.number is the PUBLIC id Payme/Click reference (lib/orders/number.ts)
//   Order.total = items subtotal + delivery price (integer UZS / so'm)
//
// Item prices are snapshotted from the cart lines (unitPrice), NOT re-read from
// the live Product, so a later price change never alters a placed order.

import { Prisma } from '@prisma/client';
import type { Order } from '@prisma/client';
import { z } from 'zod';

import { db } from '@/lib/db';
import { generateOrderNumber } from '@/lib/orders/number';
import { getDeliveryMethod } from '@/lib/delivery/methods';
import { findRegion } from '@/lib/delivery/uz-regions';
// Cart module (built in parallel by another agent). ASSUMED exports:
//   getCart(locale): Promise<CartDTO>   CartDTO { items: CartLineDTO[]; itemCount; subtotal }
//   clearCart(): Promise<void>
// CartLineDTO is assumed to carry { productId, quantity, unitPrice, isSample,
// name }. (`name` is the resolved localized product name, used by the checkout
// summary UI; order creation itself only needs productId/quantity/unitPrice/
// isSample.) If these names drift, this import is the single point to re-align.
import { getCart, clearCart } from '@/lib/cart/cart';

// ── input validation ────────────────────────────────────────────────────────

export const createOrderInputSchema = z.object({
  locale: z.enum(['ru', 'uz', 'en']).default('ru'),
  customer: z.object({
    name: z.string().trim().min(1, 'name_required'),
    phone: z.string().trim().min(5, 'phone_required'),
  }),
  address: z.object({
    region: z.string().trim().min(1, 'region_required'),
    district: z.string().trim().min(1, 'district_required'),
    // street/building free text; optional for pickup but required otherwise —
    // refined below once we know the delivery method.
    address: z.string().trim().default(''),
  }),
  deliveryMethod: z.string().trim().min(1, 'delivery_required'),
  userId: z.number().int().positive().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export class OrderCreationError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'OrderCreationError';
  }
}

const MAX_NUMBER_RETRIES = 5;

/// Resolve the delivery fee (integer so'm) for a method id. Unknown method ids
/// are rejected — never trust the client to name a method we don't ship.
function deliveryFeeFor(methodId: string): number {
  const method = getDeliveryMethod(methodId);
  if (!method) {
    throw new OrderCreationError('delivery_unknown', `Unknown delivery method: ${methodId}`);
  }
  // baseFee is the flat fee; courier `quoted` methods would refine this via a
  // live quote (lib/delivery/yandex.ts) — not wired yet, so baseFee stands.
  return method.baseFee;
}

/**
 * Create an Order from the current cart in a single transaction, then clear the
 * cart. Validates a non-empty cart and all required fields. Item unit prices are
 * snapshotted from the cart lines; the order total is `subtotal + deliveryFee`.
 *
 * @throws OrderCreationError on empty cart, bad input, or unknown delivery method.
 */
export async function createOrderFromCart(input: CreateOrderInput): Promise<Order> {
  const parsed = createOrderInputSchema.parse(input);

  // Pickup needs no street; every other method requires a non-empty address.
  if (parsed.deliveryMethod !== 'pickup' && parsed.address.address.length === 0) {
    throw new OrderCreationError('address_required', 'Street address is required for delivery');
  }

  // Validate the region exists in our dataset (defensive — drives delivery
  // availability and snapshots a known value).
  if (!findRegion(parsed.address.region)) {
    throw new OrderCreationError('region_unknown', `Unknown region: ${parsed.address.region}`);
  }

  const cart = await getCart(parsed.locale);
  if (!cart || cart.items.length === 0) {
    throw new OrderCreationError('cart_empty', 'Cannot place an order with an empty cart');
  }

  const deliveryFee = deliveryFeeFor(parsed.deliveryMethod);

  // Recompute subtotal from line snapshots rather than trusting cart.subtotal,
  // so the persisted total is internally consistent with the OrderItems.
  const subtotal = cart.items.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  const total = subtotal + deliveryFee;

  const itemsData = cart.items.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    isSample: line.isSample ?? false,
  }));

  // Generate-and-insert with retry on the (rare) unique-number collision. The
  // DB `Order.number @unique` constraint is the source of truth for uniqueness.
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_NUMBER_RETRIES; attempt += 1) {
    const number = generateOrderNumber();
    try {
      const order = await db.order.create({
        data: {
          number,
          // TODO(auth): associate a real session user once Auth.js is wired.
          // Until then guest orders carry userId = undefined and rely on phone.
          userId: parsed.userId,
          status: 'pending',
          paymentStatus: 'unpaid',
          total,
          region: parsed.address.region,
          district: parsed.address.district,
          address: parsed.address.address || null,
          phone: parsed.customer.phone,
          deliveryMethod: parsed.deliveryMethod,
          items: { create: itemsData },
        },
      });

      // Cart consumed — clear it so a refresh doesn't re-order. Best-effort:
      // a clear failure must not undo a committed order.
      try {
        await clearCart();
      } catch (clearErr) {
        console.error('[orders:create] clearCart failed (order persisted)', clearErr);
      }

      return order;
    } catch (err) {
      // P2002 = unique constraint violation. Only retry when it's the number
      // collision; anything else is a real failure.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        Array.isArray(err.meta?.target) &&
        (err.meta.target as string[]).includes('number')
      ) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw new OrderCreationError(
    'number_collision',
    `Failed to allocate a unique order number after ${MAX_NUMBER_RETRIES} attempts`,
  );
}
