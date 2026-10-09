'use server';

// Server action orchestrating place-order: validate → create order from cart →
// (online) initiate payment + redirect to the provider, or (cash) redirect to
// the order confirmation page.
//
// Next's redirect() works by throwing a control-flow signal, so it must be
// called OUTSIDE the try/catch that handles real errors — otherwise the catch
// would swallow the redirect. We compute the destination inside try, then
// redirect after.

import { redirect } from 'next/navigation';

import { getCurrentUserId } from '@/lib/auth/session';
import { readCart } from '@/lib/cart/cart';
import { createOrderFromCart, OrderCreationError } from '@/lib/orders/create';
import { findPromo, isFirstOrder } from '@/lib/promo/promo';
import { evaluatePromo } from '@/lib/promo/rules';
import { startPayment, PaymentInitiationError } from '@/lib/payments/initiate';
import type { Locale } from '@/lib/catalog/locale';

export type PaymentChoice = 'payme' | 'click' | 'cod';

/// Shape submitted by the checkout client form. Validation is re-run server-side
/// inside createOrderFromCart (zod) — never trust the client.
export interface PlaceOrderInput {
  locale: Locale;
  name: string;
  phone: string;
  region: string;
  district: string;
  address: string;
  deliveryMethod: string;
  payment: PaymentChoice;
  promoCode?: string;
}

export interface PlaceOrderResult {
  ok: false;
  /// machine-readable error code (see OrderCreationError / PaymentInitiationError)
  error: string;
}

/**
 * Place an order and route the buyer onward. On success this function does not
 * return — it redirects (to the provider for payme/click, or to the order page
 * for cash-on-delivery). On validation/data failure it returns a result the
 * client can surface inline.
 */
export async function placeOrderAction(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  let destination: string;

  try {
    const order = await createOrderFromCart({
      locale: input.locale,
      customer: { name: input.name, phone: input.phone },
      address: {
        region: input.region,
        district: input.district,
        address: input.address,
      },
      deliveryMethod: input.deliveryMethod,
      promoCode: input.promoCode || undefined,
      // userId is resolved from the Auth.js session inside createOrderFromCart;
      // guests (no session) still place orders, tracked by phone.
    });

    if (input.payment === 'cod') {
      // Cash on delivery: no Payment row, order stays pending/unpaid until an
      // operator confirms. Land on the confirmation page.
      destination = `/${input.locale}/orders/${encodeURIComponent(order.number)}`;
    } else {
      const { url } = await startPayment(order.number, input.payment, input.locale);
      destination = url;
    }
  } catch (err) {
    if (err instanceof OrderCreationError || err instanceof PaymentInitiationError) {
      return { ok: false, error: err.code };
    }
    console.error('[checkout:placeOrder]', err);
    return { ok: false, error: 'unexpected' };
  }

  // Outside try/catch: redirect() throws NEXT_REDIRECT by design.
  redirect(destination);
}

export type PromoPreview =
  | { ok: true; code: string; discount: number }
  | { ok: false; error: string };

/**
 * What a code would take off the current cart, for the checkout's "apply"
 * button. A first-order code is checked against the account when there is
 * one; a guest's phone is checked when the order is placed.
 */
export async function previewPromoAction(code: string, locale: Locale): Promise<PromoPreview> {
  try {
    const [promo, cart, userId] = await Promise.all([
      findPromo(code),
      // Read only: a preview must never create a cart.
      readCart(locale),
      getCurrentUserId(),
    ]);
    const subtotal = cart.items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const firstOrder = promo?.firstOrderOnly
      ? userId
        ? await isFirstOrder({ userId })
        : null
      : true;
    const check = evaluatePromo(promo, { subtotal, now: new Date(), isFirstOrder: firstOrder });
    return check.ok && promo
      ? { ok: true, code: promo.code, discount: check.discount }
      : check.ok
        ? { ok: false, error: 'promo_invalid' }
        : check;
  } catch (err) {
    console.error('[checkout:previewPromo]', err);
    return { ok: false, error: 'unexpected' };
  }
}
