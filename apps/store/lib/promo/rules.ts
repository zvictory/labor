// Promo code rules, free of I/O so checkout preview, order creation and the
// tests all apply the same arithmetic. Storage lives in lib/promo/promo.ts.

export type PromoKind = 'percent' | 'fixed';

export interface PromoRule {
  code: string;
  kind: string;
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  firstOrderOnly: boolean;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}

export type PromoError =
  | 'promo_invalid'
  | 'promo_inactive'
  | 'promo_not_started'
  | 'promo_expired'
  | 'promo_min_subtotal'
  | 'promo_used_up'
  | 'promo_first_order_only';

export type PromoCheck = { ok: true; discount: number } | { ok: false; error: PromoError };

/** Upper-case, spaces removed; null unless 3–32 of A–Z, 0–9, _ and -. */
export const normalizePromoCode = (raw: string): string | null => {
  const code = raw.trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9_-]{3,32}$/.test(code) ? code : null;
};

/**
 * So'm off the items subtotal. A percentage rounds down to whole so'm; a fixed
 * amount never takes the items below zero. Delivery is never discounted.
 */
export const discountFor = (rule: Pick<PromoRule, 'kind' | 'value'>, subtotal: number): number => {
  if (subtotal <= 0 || rule.value <= 0) return 0;
  if (rule.kind === 'percent') {
    return Math.floor((subtotal * Math.min(rule.value, 100)) / 100);
  }
  return Math.min(rule.value, subtotal);
};

/**
 * Whether `rule` applies to an order of `subtotal` placed at `now`. Pass
 * `isFirstOrder: null` when the buyer is not known yet (a guest's preview):
 * a first-order code then passes, and is checked again against the phone
 * when the order is placed.
 */
export const evaluatePromo = (
  rule: PromoRule | null,
  ctx: { subtotal: number; now: Date; isFirstOrder: boolean | null },
): PromoCheck => {
  if (!rule) return { ok: false, error: 'promo_invalid' };
  if (!rule.active) return { ok: false, error: 'promo_inactive' };
  if (rule.startsAt && ctx.now < rule.startsAt) return { ok: false, error: 'promo_not_started' };
  if (rule.endsAt && ctx.now > rule.endsAt) return { ok: false, error: 'promo_expired' };
  if (rule.maxUses !== null && rule.usedCount >= rule.maxUses) {
    return { ok: false, error: 'promo_used_up' };
  }
  if (rule.firstOrderOnly && ctx.isFirstOrder === false) {
    return { ok: false, error: 'promo_first_order_only' };
  }
  if (ctx.subtotal < rule.minSubtotal) return { ok: false, error: 'promo_min_subtotal' };
  return { ok: true, discount: discountFor(rule, ctx.subtotal) };
};
