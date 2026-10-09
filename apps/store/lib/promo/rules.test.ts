import { describe, expect, it } from 'vitest';

import { discountFor, evaluatePromo, normalizePromoCode, type PromoRule } from './rules';

const rule = (over: Partial<PromoRule> = {}): PromoRule => ({
  code: 'WELCOME10',
  kind: 'percent',
  value: 10,
  minSubtotal: 0,
  maxUses: null,
  usedCount: 0,
  firstOrderOnly: false,
  active: true,
  startsAt: null,
  endsAt: null,
  ...over,
});

const now = new Date('2026-10-10T12:00:00Z');

describe('normalizePromoCode', () => {
  it('upper-cases and drops spaces', () => {
    expect(normalizePromoCode('  welcome 10 ')).toBe('WELCOME10');
  });
  it('rejects codes that are too short, too long or have other characters', () => {
    expect(normalizePromoCode('ab')).toBeNull();
    expect(normalizePromoCode('x'.repeat(33))).toBeNull();
    expect(normalizePromoCode('SALE!')).toBeNull();
    expect(normalizePromoCode('СКИДКА')).toBeNull();
  });
});

describe('discountFor', () => {
  it('rounds a percentage down to whole soʼm', () => {
    expect(discountFor({ kind: 'percent', value: 10 }, 160_005)).toBe(16_000);
  });
  it('never takes a fixed amount past the subtotal', () => {
    expect(discountFor({ kind: 'fixed', value: 50_000 }, 32_000)).toBe(32_000);
    expect(discountFor({ kind: 'fixed', value: 50_000 }, 160_000)).toBe(50_000);
  });
  it('caps a percentage at 100 and ignores non-positive values', () => {
    expect(discountFor({ kind: 'percent', value: 150 }, 100_000)).toBe(100_000);
    expect(discountFor({ kind: 'percent', value: 0 }, 100_000)).toBe(0);
  });
});

describe('evaluatePromo', () => {
  const ctx = { subtotal: 320_000, now, isFirstOrder: true };

  it('applies a valid code', () => {
    expect(evaluatePromo(rule(), ctx)).toEqual({ ok: true, discount: 32_000 });
  });

  it.each([
    [null, 'promo_invalid'],
    [rule({ active: false }), 'promo_inactive'],
    [rule({ startsAt: new Date('2026-11-01') }), 'promo_not_started'],
    [rule({ endsAt: new Date('2026-10-01') }), 'promo_expired'],
    [rule({ maxUses: 5, usedCount: 5 }), 'promo_used_up'],
    [rule({ minSubtotal: 500_000 }), 'promo_min_subtotal'],
  ] as const)('refuses %#', (r, error) => {
    expect(evaluatePromo(r, ctx)).toEqual({ ok: false, error });
  });

  it('holds first-order codes to the first order', () => {
    const first = rule({ firstOrderOnly: true });
    expect(evaluatePromo(first, { ...ctx, isFirstOrder: false })).toEqual({
      ok: false,
      error: 'promo_first_order_only',
    });
    // Unknown buyer (guest preview): passes now, checked again on the order.
    expect(evaluatePromo(first, { ...ctx, isFirstOrder: null }).ok).toBe(true);
  });
});
