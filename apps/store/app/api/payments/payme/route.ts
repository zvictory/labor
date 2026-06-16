// POST /api/payments/payme — Payme JSON-RPC merchant endpoint.
//
// All six methods live on this single endpoint (Payme calls them by `method`).
// Flow per request:
//   1. Verify Basic auth (verifyPaymeAuth). 403 on failure.
//   2. Parse the JSON-RPC body.
//   3. Resolve the order by its public number (params.account.order_id).
//   4. Verify the so'm<->tiyin amount where the method carries one.
//   5. Record the hit in PaymentWebhookEvent idempotently BEFORE mutating
//      order/payment state, keyed (provider='payme', externalTxnId, eventType).
//      externalTxnId = Payme transaction id (params.id) when present, else the
//      order number (CheckPerformTransaction has no txn id yet). eventType =
//      the JSON-RPC method. On duplicate, return the stored prior response.
//   6. Shape the proper Payme success/error envelope.
//
// Order/payment state mutation is delegated to lib/orders/payment-state.ts
// (markPaymentAuthorized / markOrderPaid / markPaymentCanceled), which is
// transactional and idempotent. Verify + idempotency + response shaping here.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  verifyPaymeAuth,
  paymeResponse,
  paymeError,
  paymeAmountMatches,
  PAYME_ERRORS,
  PAYME_STATE,
  type PaymeRequest,
} from '@/lib/payments/payme';
import {
  markPaymentAuthorized,
  markOrderPaid,
  markPaymentCanceled,
} from '@/lib/orders/payment-state';

const PROVIDER = 'payme';

type JsonRpcId = number | string | null;

/// Look up an order by its public number (Payme account.order_id carries it).
async function findOrderByNumber(orderNumber: string | undefined) {
  if (!orderNumber) return null;
  return db.order.findUnique({
    where: { number: orderNumber },
    select: {
      id: true,
      number: true,
      total: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/// Record a webhook event idempotently. Returns the stored prior response when
/// this (provider, externalTxnId, eventType) was already seen, else records a
/// fresh row and returns { duplicate: false }.
async function recordEvent(
  externalTxnId: string,
  eventType: string,
  payload: unknown,
  orderId: number | null,
): Promise<{ duplicate: true; priorResponse: unknown } | { duplicate: false }> {
  const existing = await db.paymentWebhookEvent.findUnique({
    where: {
      provider_externalTxnId_eventType: {
        provider: PROVIDER,
        externalTxnId,
        eventType,
      },
    },
    select: { response: true },
  });

  if (existing) {
    return { duplicate: true, priorResponse: existing.response };
  }

  await db.paymentWebhookEvent.create({
    data: {
      provider: PROVIDER,
      externalTxnId,
      eventType,
      payload: payload as object,
      orderId: orderId ?? undefined,
      status: 'received',
    },
  });

  return { duplicate: false };
}

/// Persist the shaped response onto the event row (best-effort) so a later
/// duplicate replays the exact same body.
async function storeResponse(
  externalTxnId: string,
  eventType: string,
  response: unknown,
): Promise<void> {
  await db.paymentWebhookEvent
    .update({
      where: {
        provider_externalTxnId_eventType: {
          provider: PROVIDER,
          externalTxnId,
          eventType,
        },
      },
      data: { response: response as object, status: 'processed', processedAt: new Date() },
    })
    .catch((err: unknown) => console.error('[payme] storeResponse failed', err));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth.
  if (!verifyPaymeAuth(req.headers.get('Authorization'))) {
    return NextResponse.json(paymeError(null, PAYME_ERRORS.INSUFFICIENT_PRIVILEGE), { status: 403 });
  }

  // 2. Parse JSON-RPC.
  let body: PaymeRequest;
  try {
    body = (await req.json()) as PaymeRequest;
  } catch {
    return NextResponse.json(paymeError(null, PAYME_ERRORS.INVALID_JSON));
  }

  const id: JsonRpcId = body.id ?? null;
  const method = body.method;
  const params = body.params ?? {};
  const orderNumber = params.account?.order_id;
  // Payme transaction id; absent on CheckPerformTransaction.
  const paymeTxnId = params.id;
  // Idempotency key: prefer the Payme txn id, else the order number.
  const externalTxnId = paymeTxnId ?? orderNumber ?? 'unknown';

  switch (method) {
    // ── 1. CheckPerformTransaction ──────────────────────────────────────────
    case 'CheckPerformTransaction': {
      const order = await findOrderByNumber(orderNumber);
      if (!order) return NextResponse.json(paymeError(id, PAYME_ERRORS.ORDER_NOT_FOUND));
      if (params.amount === undefined || !paymeAmountMatches(params.amount, order.total)) {
        return NextResponse.json(paymeError(id, PAYME_ERRORS.INVALID_AMOUNT));
      }
      if (order.paymentStatus === 'paid') {
        return NextResponse.json(paymeError(id, PAYME_ERRORS.ORDER_ALREADY_PAID));
      }
      return NextResponse.json(paymeResponse(id, { allow: true }));
    }

    // ── 2. CreateTransaction ────────────────────────────────────────────────
    case 'CreateTransaction': {
      const order = await findOrderByNumber(orderNumber);
      if (!order) return NextResponse.json(paymeError(id, PAYME_ERRORS.ORDER_NOT_FOUND));
      if (params.amount === undefined || !paymeAmountMatches(params.amount, order.total)) {
        return NextResponse.json(paymeError(id, PAYME_ERRORS.INVALID_AMOUNT));
      }
      if (order.paymentStatus === 'paid') {
        return NextResponse.json(paymeError(id, PAYME_ERRORS.ORDER_ALREADY_PAID));
      }

      const rec = await recordEvent(externalTxnId, method, body, order.id);
      if (rec.duplicate) return NextResponse.json(rec.priorResponse);

      const createTime = params.time ?? Date.now();
      // Ensure a Payment row exists and mark it authorized (Payme has created the
      // transaction; perform comes later). Idempotent — re-running won't duplicate.
      await markPaymentAuthorized(order.number, PROVIDER, externalTxnId);
      const response = paymeResponse(id, {
        create_time: createTime,
        transaction: paymeTxnId,
        state: PAYME_STATE.PENDING,
      });
      await storeResponse(externalTxnId, method, response);
      return NextResponse.json(response);
    }

    // ── 3. PerformTransaction ───────────────────────────────────────────────
    case 'PerformTransaction': {
      const order = await findOrderByNumber(orderNumber);
      if (!order) return NextResponse.json(paymeError(id, PAYME_ERRORS.TRANSACTION_NOT_FOUND));

      // Idempotency at the ledger level.
      const rec = await recordEvent(externalTxnId, method, body, order.id);
      if (rec.duplicate) return NextResponse.json(rec.priorResponse);

      // Idempotency at the domain level: already paid -> replay success.
      if (order.paymentStatus === 'paid') {
        const response = paymeResponse(id, {
          transaction: paymeTxnId,
          perform_time: order.updatedAt.getTime(),
          state: PAYME_STATE.COMPLETED,
        });
        await storeResponse(externalTxnId, method, response);
        return NextResponse.json(response);
      }

      const performTime = Date.now();
      // Mark the order paid: Payment.state='paid', paymentStatus='paid',
      // status='paid' (if pending/confirmed). Transactional + idempotent.
      await markOrderPaid(order.number, PROVIDER, externalTxnId);
      const response = paymeResponse(id, {
        transaction: paymeTxnId,
        perform_time: performTime,
        state: PAYME_STATE.COMPLETED,
      });
      await storeResponse(externalTxnId, method, response);
      return NextResponse.json(response);
    }

    // ── 4. CancelTransaction ────────────────────────────────────────────────
    case 'CancelTransaction': {
      const order = await findOrderByNumber(orderNumber);
      if (!order) return NextResponse.json(paymeError(id, PAYME_ERRORS.TRANSACTION_NOT_FOUND));

      // A delivered order cannot be cancelled.
      if (order.status === 'delivered') {
        return NextResponse.json(paymeError(id, PAYME_ERRORS.UNABLE_TO_CANCEL));
      }

      const rec = await recordEvent(externalTxnId, method, body, order.id);
      if (rec.duplicate) return NextResponse.json(rec.priorResponse);

      // If it was already performed (paid), Payme expects the post-perform
      // cancel state; otherwise a plain cancel.
      const newState =
        order.paymentStatus === 'paid' ? PAYME_STATE.CANT_CANCELLED : PAYME_STATE.CANCELLED;
      const cancelTime = Date.now();

      // Cancel the payment: Payment.state='canceled'; order canceled unless
      // already shipped/delivered; paymentStatus -> 'refunded' if it was paid
      // (a post-perform cancel == refund). Transactional + idempotent.
      await markPaymentCanceled(order.number, PROVIDER, externalTxnId, {
        refund: order.paymentStatus === 'paid',
      });
      const response = paymeResponse(id, {
        transaction: paymeTxnId,
        cancel_time: cancelTime,
        state: newState,
      });
      await storeResponse(externalTxnId, method, response);
      return NextResponse.json(response);
    }

    // ── 5. CheckTransaction ─────────────────────────────────────────────────
    case 'CheckTransaction': {
      // Read-only status probe — no ledger write needed.
      const order = await findOrderByNumber(orderNumber);
      if (!order) return NextResponse.json(paymeError(id, PAYME_ERRORS.TRANSACTION_NOT_FOUND));

      const state =
        order.paymentStatus === 'paid'
          ? PAYME_STATE.COMPLETED
          : order.status === 'canceled'
            ? PAYME_STATE.CANCELLED
            : PAYME_STATE.PENDING;

      return NextResponse.json(
        paymeResponse(id, {
          create_time: order.createdAt.getTime(),
          perform_time: order.paymentStatus === 'paid' ? order.updatedAt.getTime() : 0,
          cancel_time: order.status === 'canceled' ? order.updatedAt.getTime() : 0,
          transaction: paymeTxnId,
          state,
          reason: null,
        }),
      );
    }

    // ── 6. GetStatement ─────────────────────────────────────────────────────
    case 'GetStatement': {
      const from = new Date(params.from ?? 0);
      const to = new Date(params.to ?? Date.now());

      const payments = await db.payment.findMany({
        where: {
          provider: PROVIDER,
          state: 'paid',
          updatedAt: { gte: from, lte: to },
        },
        select: {
          externalTxnId: true,
          amount: true,
          createdAt: true,
          updatedAt: true,
          order: { select: { number: true } },
        },
      });

      const transactions = payments.map((p) => ({
        id: p.externalTxnId,
        time: p.createdAt.getTime(),
        amount: p.amount * 100, // so'm -> tiyin
        account: { order_id: p.order.number },
        create_time: p.createdAt.getTime(),
        perform_time: p.updatedAt.getTime(),
        cancel_time: 0,
        transaction: p.externalTxnId,
        state: PAYME_STATE.COMPLETED,
        reason: null,
        receivers: null,
      }));

      return NextResponse.json(paymeResponse(id, { transactions }));
    }

    // ── Unknown method ──────────────────────────────────────────────────────
    default:
      return NextResponse.json(paymeError(id, PAYME_ERRORS.METHOD_NOT_FOUND));
  }
}
