// Order creation from the active cart. This is the single write path that turns
// a cart snapshot into a persisted Order + OrderItems, honoring the shared
// order contract that Agent C's payment webhooks depend on:
//
//   new Order  → status 'pending', paymentStatus 'unpaid'
//   Order.number is the PUBLIC id Payme/Click reference (lib/orders/number.ts)
//   Order.total = items subtotal - set discount - promo discount - bonus + delivery
//                 price (integer UZS / so'm)
//
// Item prices are snapshotted from the cart lines (unitPrice), NOT re-read from
// the live Product, so a later price change never alters a placed order.

import { orderDeliveryPin } from '@/lib/delivery/delivery-pin';
import { Prisma } from '@prisma/client';
import type { Order } from '@prisma/client';
import { z } from 'zod';

import { db } from '@/lib/db';
import { generateOrderNumber } from '@/lib/orders/number';
import { getDeliveryMethod, type DeliveryMethod } from '@/lib/delivery/methods';
import {
  deliveryFee as feeAfterThreshold,
  freeDeliveryThreshold,
} from '@/lib/delivery/free-delivery';
import { claimPromoUse, findPromo, isFirstOrder } from '@/lib/promo/promo';
import { evaluatePromo, fullSizeUnits } from '@/lib/promo/rules';
import { findRegion } from '@/lib/delivery/uz-regions';
import { normalizeUzPhone } from '@/lib/phone';
import { GIFT_NOTE_MAX } from '@/lib/checkout/gift';
import { bonusForOrder, recordOrderSpend } from '@/lib/loyalty/loyalty';
// Cart module (built in parallel by another agent). ASSUMED exports:
//   getCart(locale): Promise<CartDTO>   CartDTO { items: CartLineDTO[]; itemCount; subtotal }
//   clearCart(): Promise<void>
// CartLineDTO is assumed to carry { productId, quantity, unitPrice, isSample,
// name }. (`name` is the resolved localized product name, used by the checkout
// summary UI; order creation itself only needs productId/quantity/unitPrice/
// isSample.) If these names drift, this import is the single point to re-align.
import { getCart, clearCart } from '@/lib/cart/cart';
import { getCurrentUserId } from '@/lib/auth/session';
import { attributionColumns, type Attribution } from '@/lib/attribution/attribution';

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
    pin: z.unknown().optional(),
  }),
  deliveryMethod: z.string().trim().min(1, 'delivery_required'),
  userId: z.number().int().positive().optional(),
  // Checked again here whatever the checkout preview said.
  promoCode: z.string().trim().max(64).optional(),
  // Pay part of the items with Labor bonus: as much as the 30% limit and the
  // balance allow. Members only; not together with a promo code.
  useBonus: z.boolean().optional(),
  // A gift: the card text and, when it goes to someone else, who receives it.
  gift: z
    .object({
      note: z.string().trim().max(GIFT_NOTE_MAX, 'gift_note_long').default(''),
      recipientName: z.string().trim().max(80).default(''),
      recipientPhone: z.string().trim().max(32).default(''),
    })
    .optional(),
});

export type CreateOrderInput = z.input<typeof createOrderInputSchema>;

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

/// Resolve a delivery method by id. Unknown method ids are rejected — never
/// trust the client to name a method we don't ship.
function deliveryMethodFor(methodId: string): DeliveryMethod {
  const method = getDeliveryMethod(methodId);
  if (!method) {
    throw new OrderCreationError('delivery_unknown', `Unknown delivery method: ${methodId}`);
  }
  return method;
}

/**
 * Create an Order from the current cart in a single transaction, then clear the
 * cart. Validates a non-empty cart and all required fields. Item unit prices are
 * snapshotted from the cart lines; the order total is the lines, less what the
 * discovery sets and a promo code take off, plus delivery. A promo code is re-validated here and its
 * use is counted in the same transaction as the order. `opts.attribution` is
 * the visitor's ad tags (lib/attribution), stored with the order.
 *
 * @throws OrderCreationError on empty cart, bad input, or unknown delivery method.
 */
export async function createOrderFromCart(
  input: CreateOrderInput,
  opts: { attribution?: Attribution | null } = {},
): Promise<Order> {
  const parsed = createOrderInputSchema.parse(input);
  const deliveryPin = orderDeliveryPin(
    parsed.address.pin,
    parsed.deliveryMethod,
    parsed.address.region,
  );

  // Pickup needs no street; every other method requires a non-empty address.
  if (parsed.deliveryMethod !== 'pickup' && parsed.address.address.length === 0) {
    throw new OrderCreationError('address_required', 'Street address is required for delivery');
  }

  // Validate the region exists in our dataset (defensive — drives delivery
  // availability and snapshots a known value).
  if (!findRegion(parsed.address.region)) {
    throw new OrderCreationError('region_unknown', `Unknown region: ${parsed.address.region}`);
  }

  // A recipient's number is optional, but one that is given must be callable:
  // the courier rings it.
  const gift = parsed.gift;
  const giftPhone = gift?.recipientPhone ? normalizeUzPhone(gift.recipientPhone) : null;
  if (gift?.recipientPhone && !giftPhone) {
    throw new OrderCreationError('gift_phone_invalid', 'Recipient phone is not a valid number');
  }

  const cart = await getCart(parsed.locale);
  if (!cart || cart.items.length === 0) {
    throw new OrderCreationError('cart_empty', 'Cannot place an order with an empty cart');
  }

  // Associate the order with the signed-in user when one exists. An explicit
  // `userId` on the input wins (e.g. an admin placing on behalf of someone);
  // otherwise we read it from the session. Guests fall through to undefined.
  const userId = parsed.userId ?? (await getCurrentUserId());

  const method = deliveryMethodFor(parsed.deliveryMethod);

  if (parsed.useBonus && parsed.promoCode) {
    throw new OrderCreationError('bonus_with_promo');
  }
  if (parsed.useBonus && !userId) {
    throw new OrderCreationError('bonus_needs_account');
  }

  // Recompute the lines from their snapshots rather than trusting cart.subtotal,
  // so the persisted total is internally consistent with the OrderItems. What
  // the discovery sets take off comes first; a promo code works on what is left.
  const linesTotal = cart.items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const setDiscount = Math.min(cart.setDiscount, linesTotal);
  const subtotal = linesTotal - setDiscount;

  const promo = parsed.promoCode ? await findPromo(parsed.promoCode) : null;
  let discount = 0;
  if (parsed.promoCode) {
    const firstOrder = promo?.firstOrderOnly
      ? await isFirstOrder({ userId, phone: parsed.customer.phone })
      : true;
    const check = evaluatePromo(promo, {
      subtotal,
      now: new Date(),
      isFirstOrder: firstOrder,
      unitPrices: fullSizeUnits(cart.items),
    });
    if (!check.ok) throw new OrderCreationError(check.error);
    discount = check.discount;
  }

  // baseFee is the flat fee; courier `quoted` methods would refine it via a live
  // quote (lib/delivery/yandex.ts) — not wired yet. The free-delivery threshold
  // is measured on the items after the discount; bonus is a way of paying, so
  // it does not move an order below the threshold.
  const deliveryFee = feeAfterThreshold(method, subtotal - discount, freeDeliveryThreshold());

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
      const order = await db.$transaction(async (tx) => {
        // The last use of a limited code can go between the check above and
        // here; the claim is decided by the database, inside this transaction,
        // so a failed order also gives the use back.
        if (promo && discount > 0 && !(await claimPromoUse(tx, promo.id))) {
          throw new OrderCreationError('promo_used_up');
        }
        // The bonus is worked out here, under the member's lock, so two orders
        // placed at once cannot use the same balance.
        const bonus =
          parsed.useBonus && userId
            ? await bonusForOrder(tx, { userId, itemsTotal: subtotal, now: new Date() })
            : null;
        const bonusSpent = bonus?.amount ?? 0;
        const total = subtotal - discount - bonusSpent + deliveryFee;
        const created = await tx.order.create({
          data: {
            number,
            // Session user (or explicit override); guest orders carry undefined
            // and are tracked by phone.
            userId,
            status: 'pending',
            paymentStatus: 'unpaid',
            total,
            promoCode: promo && discount > 0 ? promo.code : null,
            discount,
            setDiscount,
            bonusSpent,
            isGift: gift !== undefined,
            giftNote: gift?.note || null,
            giftRecipientName: gift?.recipientName || null,
            giftRecipientPhone: giftPhone,
            region: parsed.address.region,
            district: parsed.address.district,
            address: parsed.address.address || null,
            phone: parsed.customer.phone,
            deliveryMethod: parsed.deliveryMethod,
            deliveryLatitude: deliveryPin?.lat ?? null,
            deliveryLongitude: deliveryPin?.lng ?? null,
            ...attributionColumns(opts.attribution ?? null),
            items: { create: itemsData },
          },
        });
        if (bonus && bonusSpent > 0) {
          await recordOrderSpend(tx, {
            accountId: bonus.accountId,
            orderId: created.id,
            amount: bonusSpent,
          });
        }
        return created;
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
