// Order/payment state transitions for the payment subsystem (P3).
//
// These are the ONLY place order/payment state changes happen in response to a
// provider webhook. Each helper is:
//   - idempotent: re-applying the same provider event is a no-op (guarded on the
//     current Order.paymentStatus / Order.status / Payment.state, in addition to
//     the PaymentWebhookEvent unique that already dedupes at the ledger level);
//   - transactional: the Payment row and the Order row move together so a partial
//     apply can't leave them inconsistent.
//
// Contract (matches Agent B's order creation — see CLAUDE.md / schema.prisma):
//   Order.status:        'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'canceled'
//   Order.paymentStatus: 'unpaid' | 'paid' | 'refunded'
//   Payment.state:       'created' | 'authorized' | 'paid' | 'canceled'
//   Orders are referenced by Order.number; Payment is matched by (orderId, provider).
//
// Money is integer UZS minor units (so'm). Provider amount checks are done in the
// route helpers BEFORE calling these — here we trust the resolved Order.total.

import type { Order, Payment, Prisma, PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';

/// Provider identifiers stored on Payment.provider / PaymentWebhookEvent.provider.
export type PaymentProvider = 'payme' | 'click' | 'uzum';

/// Tx-or-client: helpers accept either the root `db` or a `$transaction` handle so
/// they can compose. Excludes the client-only methods that aren't valid inside a tx.
type Db = PrismaClient | Prisma.TransactionClient;

/// Statuses past which an order has physically moved and must NOT be auto-canceled
/// by a late provider cancel callback.
const SHIPPED_OR_LATER: ReadonlySet<string> = new Set(['shipped', 'delivered']);

/// Order statuses from which a successful payment is allowed to advance status to
/// 'paid'. Anything already further along (shipped/delivered) or canceled is left
/// untouched — paymentStatus still flips to 'paid' but we don't rewind status.
const PAYABLE_ORDER_STATUSES: ReadonlySet<string> = new Set(['pending', 'confirmed']);

/// Look up an order by its public number. Returns the full row (or null). Used by
/// the routes when they need order fields beyond the narrow `select` they do for
/// verification.
export async function findOrderForPayment(orderNumber: string): Promise<Order | null> {
  return db.order.findUnique({ where: { number: orderNumber } });
}

/// Fetch the (single) Payment row for an order+provider, if any. Provider+order is
/// treated as a logical key here: one in-flight provider payment per order.
export async function getPaymentByOrder(
  orderNumber: string,
  provider: PaymentProvider,
  client: Db = db,
): Promise<Payment | null> {
  const order = await client.order.findUnique({
    where: { number: orderNumber },
    select: { id: true },
  });
  if (!order) return null;
  return client.payment.findFirst({
    where: { orderId: order.id, provider },
    orderBy: { id: 'desc' },
  });
}

/// Find-or-create the Payment row for (order, provider), inside the given client.
/// Idempotent: if a row already exists it is returned (and its externalTxnId is
/// backfilled when it was previously null), otherwise one is created in the given
/// initial state. Never duplicates the row for repeated callbacks.
async function ensurePayment(
  client: Db,
  order: { id: number; total: number },
  provider: PaymentProvider,
  externalTxnId: string,
  initialState: 'created' | 'authorized',
): Promise<Payment> {
  const existing = await client.payment.findFirst({
    where: { orderId: order.id, provider },
    orderBy: { id: 'desc' },
  });

  if (existing) {
    // Backfill the external txn id if it wasn't known at creation time.
    if (!existing.externalTxnId && externalTxnId) {
      return client.payment.update({
        where: { id: existing.id },
        data: { externalTxnId },
      });
    }
    return existing;
  }

  return client.payment.create({
    data: {
      orderId: order.id,
      provider,
      externalTxnId,
      amount: order.total,
      state: initialState,
    },
  });
}

/// Payme CreateTransaction: ensure a Payment row exists and mark it 'authorized'
/// (Payme has created the transaction but not yet performed it). Idempotent — a
/// second CreateTransaction leaves an already-'authorized'/'paid' payment alone.
/// Returns the Payment row, or null if the order doesn't exist.
export async function markPaymentAuthorized(
  orderNumber: string,
  provider: PaymentProvider,
  externalTxnId: string,
): Promise<Payment | null> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { number: orderNumber },
      select: { id: true, total: true },
    });
    if (!order) return null;

    const payment = await ensurePayment(tx, order, provider, externalTxnId, 'authorized');

    // Only advance 'created' -> 'authorized'. Never rewind 'paid'/'canceled'.
    if (payment.state === 'created') {
      return tx.payment.update({
        where: { id: payment.id },
        data: { state: 'authorized' },
      });
    }
    return payment;
  });
}

/// Mark the order paid: Payment.state -> 'paid', Order.paymentStatus -> 'paid',
/// and Order.status -> 'paid' (only when currently 'pending'/'confirmed'; orders
/// already shipped/delivered keep their fulfillment status). No-op if the order is
/// already paid. Returns the updated order, or null if it doesn't exist.
export async function markOrderPaid(
  orderNumber: string,
  provider: PaymentProvider,
  externalTxnId: string,
): Promise<Order | null> {
  // Track whether THIS call performed the real unpaid -> paid transition (vs. an
  // idempotent no-op on an already-paid order). Only the real transition fires a
  // notification, so a retried webhook never double-notifies.
  let didTransition = false;

  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { number: orderNumber },
      select: { id: true, total: true, status: true, paymentStatus: true },
    });
    if (!order) return null;

    // Domain-level idempotency: already paid -> return current row, touch nothing.
    if (order.paymentStatus === 'paid') {
      return tx.order.findUnique({ where: { id: order.id } });
    }

    const payment = await ensurePayment(tx, order, provider, externalTxnId, 'authorized');
    if (payment.state !== 'paid') {
      await tx.payment.update({
        where: { id: payment.id },
        data: { state: 'paid', externalTxnId: payment.externalTxnId ?? externalTxnId },
      });
    }

    const nextStatus = PAYABLE_ORDER_STATUSES.has(order.status) ? 'paid' : order.status;

    const updated = await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'paid', status: nextStatus },
    });
    didTransition = true;
    return updated;
  });

  // Best-effort, AFTER-commit notification. Lazy import breaks the potential
  // cycle (notify -> bot/queries -> db). Never let a notify failure escape into
  // the payment flow, and never re-notify on an idempotent replay.
  if (didTransition && result) {
    try {
      const { notifyOrderPaid } = await import('@/lib/telegram/notify');
      await notifyOrderPaid(result.number);
    } catch (err) {
      console.error('[payment-state] notifyOrderPaid failed:', err);
    }
  }

  return result;
}

/// Cancel the provider payment: Payment.state -> 'canceled'. If the order hasn't
/// shipped/delivered, also set Order.status -> 'canceled'. If it had already been
/// paid, set Order.paymentStatus -> 'refunded' (a post-perform cancel == refund);
/// otherwise leave paymentStatus as-is ('unpaid'). Idempotent — re-running on an
/// already-canceled payment is a no-op. Returns the updated order, or null.
export async function markPaymentCanceled(
  orderNumber: string,
  provider: PaymentProvider,
  externalTxnId: string,
  opts?: { refund?: boolean },
): Promise<Order | null> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { number: orderNumber },
      select: { id: true, total: true, status: true, paymentStatus: true },
    });
    if (!order) return null;

    const payment = await ensurePayment(tx, order, provider, externalTxnId, 'created');
    if (payment.state !== 'canceled') {
      await tx.payment.update({
        where: { id: payment.id },
        data: { state: 'canceled', externalTxnId: payment.externalTxnId ?? externalTxnId },
      });
    }

    // A post-perform cancel (or an explicit refund flag) of a paid order is a refund.
    const wasPaid = order.paymentStatus === 'paid';
    const nextPaymentStatus = wasPaid || opts?.refund ? 'refunded' : order.paymentStatus;

    // Don't cancel an order that has physically shipped/delivered.
    const nextStatus = SHIPPED_OR_LATER.has(order.status) ? order.status : 'canceled';

    return tx.order.update({
      where: { id: order.id },
      data: { status: nextStatus, paymentStatus: nextPaymentStatus },
    });
  });
}
