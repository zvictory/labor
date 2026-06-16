// Payment initiation — turns a placed order into a provider redirect URL.
//
// Responsibility boundary (HARD): this records a fresh Payment row in state
// 'created' and builds the hosted-checkout URL. It does NOT move the order to a
// paid state — that transition belongs exclusively to the provider webhook
// (Agent C, lib/orders/payment-state.ts). We never mutate Order.paymentStatus
// or Order.status here.

import type { Payment } from '@prisma/client';

import { db } from '@/lib/db';
import { createPaymePaymentUrl } from '@/lib/payments/payme';
import { createClickPaymentUrl } from '@/lib/payments/click';
import type { Locale } from '@/lib/catalog/locale';

export type OnlineProvider = 'payme' | 'click';

export class PaymentInitiationError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'PaymentInitiationError';
  }
}

/**
 * Begin an online payment for an existing order.
 *
 * Loads the order by its public number, creates a Payment(state 'created',
 * provider, amount = order.total), and returns the provider's hosted-checkout
 * URL. The caller redirects the buyer there; the provider then drives the
 * webhook that flips paid-state.
 *
 * @throws PaymentInitiationError when the order is missing or already paid.
 */
export async function startPayment(
  orderNumber: string,
  provider: OnlineProvider,
  locale: Locale = 'ru',
): Promise<{ url: string }> {
  const order = await db.order.findUnique({
    where: { number: orderNumber },
    select: { id: true, number: true, total: true, paymentStatus: true },
  });

  if (!order) {
    throw new PaymentInitiationError('order_not_found', `No order ${orderNumber}`);
  }
  if (order.paymentStatus === 'paid') {
    throw new PaymentInitiationError('order_already_paid', `Order ${orderNumber} already paid`);
  }

  // Record the attempt. external_txn_id is filled by the webhook once the
  // provider assigns its transaction id; here it stays null.
  const payment: Payment = await db.payment.create({
    data: {
      orderId: order.id,
      provider,
      amount: order.total,
      state: 'created',
    },
  });
  // payment is created for the audit/idempotency trail; the URL drives redirect.
  void payment;

  // Provider checkout URLs expect uz/ru/en; Locale is already that union.
  const checkoutLocale = locale;

  const url =
    provider === 'payme'
      ? createPaymePaymentUrl({
          orderNumber: order.number,
          amountSom: order.total,
          locale: checkoutLocale,
        })
      : createClickPaymentUrl({
          orderId: order.id,
          orderNumber: order.number,
          amount: order.total,
          locale: checkoutLocale,
        });

  return { url };
}
