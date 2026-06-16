// Public order-number generator. Order.number is the human-facing id that
// Payme/Click webhooks (Agent C) reference, so it must be unique and readable.
//
// Format: `LB-YYYYMMDD-XXXXXX` where XXXXXX is 6 uppercased base36 chars derived
// from crypto randomness, e.g. `LB-20260616-7F3K2Q`.
//
// Uniqueness is NOT guaranteed by this function alone — collisions are
// astronomically unlikely (~2.1e9 combinations per day) but possible. The
// authoritative guarantee is the DB `Order.number @unique` constraint; the
// caller (createOrderFromCart) generates, attempts the insert, and on a unique
// violation regenerates and retries. See lib/orders/create.ts.

import { randomBytes } from 'crypto';

const SUFFIX_LEN = 6;

/// `YYYYMMDD` in UTC (deterministic regardless of server TZ).
function dateStamp(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/// 6 uppercased base36 chars from cryptographic randomness.
function randomSuffix(): string {
  // 4 random bytes → up to ~4.29e9 values → at least 6 base36 digits.
  const n = randomBytes(4).readUInt32BE(0);
  return n.toString(36).toUpperCase().padStart(SUFFIX_LEN, '0').slice(-SUFFIX_LEN);
}

/// Generate a candidate public order number. Uniqueness is enforced by the DB
/// unique index + caller retry — do not assume this value is collision-free.
export function generateOrderNumber(now: Date = new Date()): string {
  return `LB-${dateStamp(now)}-${randomSuffix()}`;
}
