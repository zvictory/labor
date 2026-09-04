// POST /api/payments/click/webhook — Click PREPARE/COMPLETE callback.
//
// Click hits this endpoint twice with form-encoded bodies:
//   action=0 (PREPARE)  — reserve/validate the payment
//   action=1 (COMPLETE) — confirm (or, with a negative `error`, cancel)
//
// Flow:
//   1. Parse form body.
//   2. Verify the MD5 signature (verifyClickSign) — SIGN_FAILED on mismatch.
//   3. Resolve order by merchant_trans_id (Labor Order.number).
//   4. Verify the so'm amount (clickAmountMatches).
//   5. Record the hit in PaymentWebhookEvent idempotently BEFORE mutating
//      order/payment state — key (provider='click', externalTxnId, eventType).
//      externalTxnId = click_trans_id; eventType = 'prepare' | 'complete'.
//      On duplicate, replay the stored prior response.
//   6. Shape the proper Click reply.
//
// Order/payment mutation is delegated to lib/orders/payment-state.ts
// (markPaymentAuthorized / markOrderPaid / markPaymentCanceled) — transactional
// and idempotent.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  verifyClickSign,
  clickAmountMatches,
  clickReply,
  CLICK_ERRORS,
  CLICK_ACTION,
  type ClickWebhookBody,
} from '@/lib/payments/click';
import {
  markPaymentAuthorized,
  markOrderPaid,
  markPaymentCanceled,
} from '@/lib/orders/payment-state';

const PROVIDER = 'click';

async function recordEvent(
  externalTxnId: string,
  eventType: string,
  payload: unknown,
  orderId: number | null,
): Promise<{ duplicate: true; priorResponse: unknown } | { duplicate: false }> {
  const existing = await db.paymentWebhookEvent.findUnique({
    where: {
      provider_externalTxnId_eventType: { provider: PROVIDER, externalTxnId, eventType },
    },
    select: { response: true },
  });
  if (existing) return { duplicate: true, priorResponse: existing.response };

  await db.paymentWebhookEvent.create({
    data: {
      provider: PROVIDER,
      externalTxnId,
      eventType,
      payload: JSON.stringify(payload),
      orderId: orderId ?? undefined,
      status: 'received',
    },
  });
  return { duplicate: false };
}

async function storeResponse(
  externalTxnId: string,
  eventType: string,
  response: unknown,
): Promise<void> {
  await db.paymentWebhookEvent
    .update({
      where: { provider_externalTxnId_eventType: { provider: PROVIDER, externalTxnId, eventType } },
      data: { response: response as object, status: 'processed', processedAt: new Date() },
    })
    .catch((err: unknown) => console.error('[click] storeResponse failed', err));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse form body.
  let body: ClickWebhookBody;
  try {
    const form = await req.formData();
    body = Object.fromEntries(form.entries()) as unknown as ClickWebhookBody;
  } catch {
    return NextResponse.json(
      { error: CLICK_ERRORS.BAD_REQUEST, error_note: 'Bad request' },
      { status: 400 },
    );
  }

  const {
    click_trans_id,
    service_id,
    merchant_trans_id,
    merchant_prepare_id,
    amount,
    action,
    sign_time,
    sign_string,
    error: clickError,
  } = body;

  // 2. Signature verification.
  const validSign = verifyClickSign({
    clickTransId: click_trans_id,
    serviceId: service_id,
    merchantTransId: merchant_trans_id,
    merchantPrepareId: merchant_prepare_id,
    amount,
    action,
    signTime: sign_time,
    signString: sign_string,
  });

  if (!validSign) {
    return NextResponse.json(
      clickReply({
        clickTransId: click_trans_id,
        merchantTransId: merchant_trans_id,
        error: CLICK_ERRORS.SIGN_FAILED,
        errorNote: 'Invalid sign',
      }),
    );
  }

  // 3. Resolve order by public number.
  const order = await db.order.findUnique({
    where: { number: merchant_trans_id },
    select: { id: true, number: true, total: true, paymentStatus: true },
  });

  if (!order) {
    return NextResponse.json(
      clickReply({
        clickTransId: click_trans_id,
        merchantTransId: merchant_trans_id,
        error: CLICK_ERRORS.USER_NOT_FOUND,
        errorNote: 'Order not found',
      }),
    );
  }

  // 4. Amount verification (Click works in whole so'm == order.total).
  if (!clickAmountMatches(amount, order.total)) {
    return NextResponse.json(
      clickReply({
        clickTransId: click_trans_id,
        merchantTransId: merchant_trans_id,
        error: CLICK_ERRORS.INVALID_AMOUNT,
        errorNote: 'Amount mismatch',
      }),
    );
  }

  // ── PREPARE (action=0) ────────────────────────────────────────────────────
  if (action === String(CLICK_ACTION.PREPARE)) {
    const eventType = 'prepare';

    if (order.paymentStatus === 'paid') {
      return NextResponse.json(
        clickReply({
          clickTransId: click_trans_id,
          merchantTransId: merchant_trans_id,
          error: CLICK_ERRORS.ALREADY_PAID,
          errorNote: 'Already paid',
        }),
      );
    }

    const rec = await recordEvent(click_trans_id, eventType, body, order.id);
    if (rec.duplicate) return NextResponse.json(rec.priorResponse);

    // Ensure a Payment row (state 'authorized' — Click has reserved the
    // payment; COMPLETE confirms it). Idempotent; merchant_trans_id == number.
    await markPaymentAuthorized(merchant_trans_id, PROVIDER, click_trans_id);
    const response = clickReply({
      clickTransId: click_trans_id,
      merchantTransId: merchant_trans_id,
      merchantPrepareId: order.id,
      error: CLICK_ERRORS.SUCCESS,
      errorNote: 'Success',
    });
    await storeResponse(click_trans_id, eventType, response);
    return NextResponse.json(response);
  }

  // ── COMPLETE (action=1) ───────────────────────────────────────────────────
  if (action === String(CLICK_ACTION.COMPLETE)) {
    const eventType = 'complete';
    const rec = await recordEvent(click_trans_id, eventType, body, order.id);
    if (rec.duplicate) return NextResponse.json(rec.priorResponse);

    // Negative `error` from Click => payment failed/cancelled.
    if (clickError && Number.parseInt(clickError, 10) < 0) {
      // Click reported failure on COMPLETE — cancel the payment/order.
      // Refund if it had somehow already been paid. Idempotent.
      await markPaymentCanceled(merchant_trans_id, PROVIDER, click_trans_id, {
        refund: order.paymentStatus === 'paid',
      });
      const response = clickReply({
        clickTransId: click_trans_id,
        merchantTransId: merchant_trans_id,
        merchantConfirmId: order.id,
        error: CLICK_ERRORS.SUCCESS,
        errorNote: 'Cancelled',
      });
      await storeResponse(click_trans_id, eventType, response);
      return NextResponse.json(response);
    }

    // Success on COMPLETE — mark paid: Payment.state='paid', paymentStatus='paid',
    // status='paid' (if pending/confirmed). Transactional + idempotent.
    await markOrderPaid(merchant_trans_id, PROVIDER, click_trans_id);
    const response = clickReply({
      clickTransId: click_trans_id,
      merchantTransId: merchant_trans_id,
      merchantConfirmId: order.id,
      error: CLICK_ERRORS.SUCCESS,
      errorNote: 'Success',
    });
    await storeResponse(click_trans_id, eventType, response);
    return NextResponse.json(response);
  }

  // ── Unknown action ────────────────────────────────────────────────────────
  return NextResponse.json(
    clickReply({
      clickTransId: click_trans_id,
      merchantTransId: merchant_trans_id,
      error: CLICK_ERRORS.ACTION_NOT_FOUND,
      errorNote: 'Unknown action',
    }),
  );
}
