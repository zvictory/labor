// Payme JSON-RPC merchant-API helpers, ported by reference from bebio
// (lib/payme.ts). https://developer.help.paycom.uz
//
// Adaptations for Labor:
//  - Account key: Payme `params.account.order_id` carries Labor's public
//    `Order.number` (string), NOT the internal autoincrement `Order.id`.
//    Spree/Labor orders are looked up by `number`; the route resolves it.
//  - Amount: Payme always works in TIYIN. Labor stores money as integer UZS
//    minor units (so'm). Expected tiyin = order.total * 100 (see somToTiyin).
//    We tolerate a +/-100 tiyin (1 so'm) rounding window like bebio.
//  - Auth: Basic base64(merchant_id : key). The key env is PAYME_KEY
//    (matching apps/store/.env.example), with PAYME_SECRET_KEY as a fallback.

import type { LocalizedMessage } from '@/lib/payments/types';
import { somToTiyin } from '@/lib/payments/types';

const MERCHANT_ID = process.env.PAYME_MERCHANT_ID ?? '';
// .env.example uses PAYME_KEY; accept PAYME_SECRET_KEY too (bebio's name).
const SECRET_KEY = process.env.PAYME_KEY ?? process.env.PAYME_SECRET_KEY ?? '';
const SITE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3002';
const CHECKOUT_URL = process.env.PAYME_CHECKOUT_URL ?? 'https://checkout.paycom.uz';

/// Tolerated rounding window (in tiyin) when comparing provider amount to the
/// order total. 100 tiyin === 1 so'm.
export const PAYME_AMOUNT_TOLERANCE_TIYIN = 100;

/// Payme JSON-RPC error catalog. Codes are dictated by the Payme spec.
export const PAYME_ERRORS = {
  METHOD_NOT_FOUND: {
    code: -32601,
    message: { uz: 'Metod topilmadi', ru: 'Метод не найден', en: 'Method not found' },
  },
  INVALID_JSON: {
    code: -32700,
    message: { uz: "Noto'g'ri JSON", ru: 'Неверный JSON', en: 'Invalid JSON' },
  },
  INSUFFICIENT_PRIVILEGE: {
    code: -32504,
    message: { uz: "Ruxsat yo'q", ru: 'Нет доступа', en: 'Forbidden' },
  },
  INVALID_AMOUNT: {
    code: -31001,
    message: { uz: "Noto'g'ri summa", ru: 'Неверная сумма', en: 'Invalid amount' },
  },
  ORDER_NOT_FOUND: {
    code: -31050,
    message: { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' },
  },
  ORDER_ALREADY_PAID: {
    code: -31051,
    message: {
      uz: "Buyurtma allaqachon to'langan",
      ru: 'Заказ уже оплачен',
      en: 'Order already paid',
    },
  },
  CANT_PERFORM_TRANSACTION: {
    code: -31008,
    message: {
      uz: "Tranzaksiyani bajarib bo'lmaydi",
      ru: 'Невозможно выполнить транзакцию',
      en: "Can't perform transaction",
    },
  },
  TRANSACTION_NOT_FOUND: {
    code: -31003,
    message: {
      uz: 'Tranzaksiya topilmadi',
      ru: 'Транзакция не найдена',
      en: 'Transaction not found',
    },
  },
  TRANSACTION_ALREADY_CANCELLED: {
    code: -31007,
    message: {
      uz: 'Tranzaksiya bekor qilingan',
      ru: 'Транзакция отменена',
      en: 'Transaction already cancelled',
    },
  },
  UNABLE_TO_CANCEL: {
    code: -31007,
    message: { uz: "Bekor qilib bo'lmaydi", ru: 'Невозможно отменить', en: 'Unable to cancel' },
  },
} as const satisfies Record<string, { code: number; message: LocalizedMessage }>;

/// Payme transaction states (Payme spec values).
export const PAYME_STATE = {
  PENDING: 1, // created, awaiting perform
  COMPLETED: 2, // performed/paid
  CANCELLED: -1, // cancelled before perform
  CANT_CANCELLED: -2, // cancelled after perform (refunded)
} as const;

export type PaymeState = (typeof PAYME_STATE)[keyof typeof PAYME_STATE];

/// The Payme JSON-RPC methods Labor implements.
export type PaymeMethod =
  | 'CheckPerformTransaction'
  | 'CreateTransaction'
  | 'PerformTransaction'
  | 'CancelTransaction'
  | 'CheckTransaction'
  | 'GetStatement';

/// Inbound JSON-RPC request body (Payme always POSTs this shape).
export interface PaymeRequest {
  jsonrpc?: '2.0';
  id: number | string | null;
  method: PaymeMethod | string;
  params: PaymeParams;
}

/// Union of all params the methods above may carry. Fields are optional because
/// each method uses a subset; callers narrow as needed.
export interface PaymeParams {
  /// Merchant-defined account; Labor puts the public order number under order_id.
  account?: { order_id?: string };
  /// Amount in tiyin (CheckPerform/Create).
  amount?: number;
  /// Payme-side transaction id (Create/Perform/Cancel/Check).
  id?: string;
  /// Unix-ms timestamp Payme supplies on CreateTransaction.
  time?: number;
  /// Cancel reason code.
  reason?: number;
  /// GetStatement range (unix-ms).
  from?: number;
  to?: number;
}

/// Verify Payme Basic auth header: `Basic base64(merchant_id:key)`.
export function verifyPaymeAuth(authHeader: string | null): boolean {
  if (!authHeader?.startsWith('Basic ')) return false;
  if (!MERCHANT_ID || !SECRET_KEY) return false;

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
  const sep = decoded.indexOf(':');
  if (sep === -1) return false;
  const id = decoded.slice(0, sep);
  const key = decoded.slice(sep + 1);

  return id === MERCHANT_ID && key === SECRET_KEY;
}

/// Standard Payme JSON-RPC success envelope.
export function paymeResponse(
  id: number | string | null,
  result: Record<string, unknown>,
): { jsonrpc: '2.0'; id: number | string | null; result: Record<string, unknown> } {
  return { jsonrpc: '2.0', id, result };
}

/// Standard Payme JSON-RPC error envelope.
export function paymeError(
  id: number | string | null,
  error: { code: number; message: LocalizedMessage | string },
): {
  jsonrpc: '2.0';
  id: number | string | null;
  error: { code: number; message: LocalizedMessage | string };
} {
  return { jsonrpc: '2.0', id, error };
}

/// True when the provider's tiyin amount matches the order's so'm total
/// within the rounding tolerance. `orderTotalSom` is integer UZS minor units.
export function paymeAmountMatches(amountTiyin: number, orderTotalSom: number): boolean {
  if (!Number.isFinite(amountTiyin)) return false;
  const expectedTiyin = somToTiyin(orderTotalSom);
  return Math.abs(amountTiyin - expectedTiyin) <= PAYME_AMOUNT_TOLERANCE_TIYIN;
}

/// Build a hosted Payme checkout URL. `amountSom` is integer UZS minor units;
/// Payme expects tiyin in the `a` field. `orderNumber` is Labor's public order
/// number and rides in the `order_id` account key.
export function createPaymePaymentUrl(params: {
  orderNumber: string;
  amountSom: number;
  locale?: 'uz' | 'ru' | 'en';
}): string {
  const { orderNumber, amountSom, locale = 'uz' } = params;
  const data = {
    m: MERCHANT_ID,
    ac: { order_id: orderNumber },
    a: somToTiyin(amountSom),
    l: locale,
    c: `${SITE_URL}/${locale}/orders/${encodeURIComponent(orderNumber)}`,
  };
  const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
  return `${CHECKOUT_URL.replace(/\/$/, '')}/${base64}`;
}
