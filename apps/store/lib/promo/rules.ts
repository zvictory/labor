// Promo code rules, free of I/O so checkout preview, order creation and the
// tests all apply the same arithmetic. Storage lives in lib/promo/promo.ts.

/**
 * percent: value % off the items. fixed: value so'm off the items.
 * bundle: "N+1" — `value` is the group size (3 for 2+1); in every full group of
 * that many full-size items, the cheapest is free. Samples never count.
 */
export type PromoKind = 'percent' | 'fixed' | 'bundle';

/** Group sizes a bundle code may have: 2+1 is 3, 1+1 is 2, up to 9+1. */
export const BUNDLE_MIN = 2;
export const BUNDLE_MAX = 10;

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
  | 'promo_first_order_only'
  | 'promo_bundle_short';

export type PromoCheck = { ok: true; discount: number } | { ok: false; error: PromoError };

/** Upper-case, spaces removed; null unless 3–32 of A–Z, 0–9, _ and -. */
export const normalizePromoCode = (raw: string): string | null => {
  const code = raw.trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9_-]{3,32}$/.test(code) ? code : null;
};

/** One price per full-size unit in the cart (a line of 2 gives two); samples left out. */
export const fullSizeUnits = (
  lines: readonly { unitPrice: number; quantity: number; isSample?: boolean | null }[],
): number[] =>
  lines.flatMap((line) =>
    line.isSample ? [] : Array.from({ length: Math.max(0, line.quantity) }, () => line.unitPrice),
  );

/**
 * "N+1": with the units dearest first, every `groupSize`-th one is free, which
 * is the cheapest of each full group. Units left over do not count.
 */
export const bundleDiscount = (groupSize: number, unitPrices: readonly number[]): number => {
  if (!Number.isInteger(groupSize) || groupSize < BUNDLE_MIN || groupSize > BUNDLE_MAX) return 0;
  const sorted = [...unitPrices].sort((a, b) => b - a);
  let free = 0;
  for (let i = groupSize - 1; i < sorted.length; i += groupSize) free += sorted[i]!;
  return free;
};

/**
 * So'm off the items subtotal. A percentage rounds down to whole so'm; a fixed
 * amount never takes the items below zero; a bundle frees the cheapest item of
 * each group (see bundleDiscount). Delivery is never discounted.
 */
export const discountFor = (
  rule: Pick<PromoRule, 'kind' | 'value'>,
  subtotal: number,
  unitPrices: readonly number[] = [],
): number => {
  if (subtotal <= 0 || rule.value <= 0) return 0;
  if (rule.kind === 'percent') {
    return Math.floor((subtotal * Math.min(rule.value, 100)) / 100);
  }
  if (rule.kind === 'bundle') return Math.min(bundleDiscount(rule.value, unitPrices), subtotal);
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
  ctx: {
    subtotal: number;
    now: Date;
    isFirstOrder: boolean | null;
    /** Full-size unit prices (fullSizeUnits); a bundle code needs them. */
    unitPrices?: readonly number[];
  },
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
  const units = ctx.unitPrices ?? [];
  if (rule.kind === 'bundle' && units.length < rule.value) {
    return { ok: false, error: 'promo_bundle_short' };
  }
  return { ok: true, discount: discountFor(rule, ctx.subtotal, units) };
};
