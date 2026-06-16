// Click Merchant-API helpers, ported by reference from bebio (lib/click.ts).
// https://docs.click.uz
//
// Adaptations for Labor:
//  - Money: Click works in whole so'm (NOT tiyin) in the redirect URL and in
//    the webhook `amount` field. Labor stores money as integer UZS minor units
//    (so'm), so amount == order.total directly (no *100). We tolerate +/-1 so'm.
//  - Account key: Click `merchant_trans_id` carries Labor's public Order.number;
//    `transaction_param` carries the internal order id for our reference.
//  - Signature: MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id
//    [+ merchant_prepare_id on COMPLETE] + amount + action + sign_time),
//    compared timing-safely. Env: CLICK_SECRET_KEY (matches .env.example).

import { createHash, timingSafeEqual } from 'crypto';

const MERCHANT_ID = process.env.CLICK_MERCHANT_ID ?? '';
const SERVICE_ID = process.env.CLICK_SERVICE_ID ?? '';
const SECRET_KEY = process.env.CLICK_SECRET_KEY ?? '';
const SITE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3002';

/// Tolerated rounding window (in so'm) when comparing Click's amount to the
/// order total.
export const CLICK_AMOUNT_TOLERANCE_SOM = 1;

/// Click webhook actions.
export const CLICK_ACTION = {
  PREPARE: 0,
  COMPLETE: 1,
} as const;

/// Click result/error codes (Click spec). 0 is success; negatives are errors.
export const CLICK_ERRORS = {
  SUCCESS: 0,
  SIGN_FAILED: -1,
  INVALID_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  USER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  BAD_REQUEST: -8,
  TRANSACTION_CANCELLED: -9,
} as const;

/// Raw form-encoded fields Click sends to the webhook (all strings).
export interface ClickWebhookBody {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id?: string;
  merchant_trans_id: string; // Labor Order.number
  merchant_prepare_id?: string; // present on COMPLETE (action=1)
  amount: string; // so'm
  action: string; // '0' prepare | '1' complete
  sign_time: string;
  sign_string: string;
  error?: string; // negative => payment failed/cancelled
  error_note?: string;
}

/// Verify the Click webhook MD5 signature, timing-safely.
///
/// The signed string differs by action:
///   PREPARE  (action=0): click_trans_id + service_id + SECRET + merchant_trans_id
///                        + amount + action + sign_time
///   COMPLETE (action=1): click_trans_id + service_id + SECRET + merchant_trans_id
///                        + merchant_prepare_id + amount + action + sign_time
export function verifyClickSign(params: {
  clickTransId: string;
  serviceId: string;
  merchantTransId: string;
  merchantPrepareId?: string;
  amount: string;
  action: string;
  signTime: string;
  signString: string;
}): boolean {
  const {
    clickTransId,
    serviceId,
    merchantTransId,
    merchantPrepareId,
    amount,
    action,
    signTime,
    signString,
  } = params;

  if (!SECRET_KEY || !signString) return false;

  const prepareSegment =
    action === String(CLICK_ACTION.COMPLETE) ? (merchantPrepareId ?? '') : '';

  const raw =
    `${clickTransId}${serviceId}${SECRET_KEY}${merchantTransId}` +
    `${prepareSegment}${amount}${action}${signTime}`;

  // MD5 is not in Web Crypto; use Node crypto. Per Click's protocol the
  // signature is MD5 even though it's weak — match the spec exactly.
  const computed = createHash('md5').update(raw).digest('hex');

  try {
    const a = Buffer.from(computed);
    const b = Buffer.from(signString);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/// True when Click's so'm amount matches the order total within tolerance.
/// `orderTotalSom` is integer UZS minor units (so'm).
export function clickAmountMatches(amountSomRaw: string, orderTotalSom: number): boolean {
  const amount = Number.parseFloat(amountSomRaw);
  if (!Number.isFinite(amount)) return false;
  return Math.abs(amount - orderTotalSom) <= CLICK_AMOUNT_TOLERANCE_SOM;
}

/// Build the Click hosted-pay redirect URL.
/// `amountSom` is integer UZS minor units (so'm); Click's URL takes whole so'm.
/// `orderNumber` is Labor's public Order.number; `orderId` the internal id.
export function createClickPaymentUrl(params: {
  orderId: number | string;
  orderNumber: string;
  amount: number; // so'm
  locale?: 'uz' | 'ru' | 'en';
}): string {
  const { orderId, orderNumber, amount, locale = 'uz' } = params;

  if (!SERVICE_ID || !MERCHANT_ID) {
    throw new Error('CLICK_SERVICE_ID / CLICK_MERCHANT_ID env vars are not set');
  }

  const returnUrl = `${SITE_URL}/${locale}/orders/success?order=${encodeURIComponent(orderNumber)}`;
  const base = 'https://my.click.uz/services/pay';

  const query = new URLSearchParams({
    service_id: SERVICE_ID,
    merchant_id: MERCHANT_ID,
    amount: String(amount),
    transaction_param: String(orderId),
    merchant_trans_id: orderNumber,
    return_url: returnUrl,
  });

  return `${base}?${query.toString()}`;
}

/// Shape a standard Click webhook JSON reply.
export function clickReply(
  fields: {
    clickTransId: string;
    merchantTransId: string;
    error: number;
    errorNote: string;
  } & Partial<{ merchantPrepareId: number | string; merchantConfirmId: number | string }>,
): Record<string, string | number> {
  const body: Record<string, string | number> = {
    click_trans_id: fields.clickTransId,
    merchant_trans_id: fields.merchantTransId,
    error: fields.error,
    error_note: fields.errorNote,
  };
  if (fields.merchantPrepareId !== undefined) body.merchant_prepare_id = fields.merchantPrepareId;
  if (fields.merchantConfirmId !== undefined) body.merchant_confirm_id = fields.merchantConfirmId;
  return body;
}
