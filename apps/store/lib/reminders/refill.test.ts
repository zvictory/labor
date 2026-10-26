import { describe, expect, it } from 'vitest';

import {
  REFILL_DEFAULT_DAYS,
  pickRefillReminders,
  refillDays,
  refillMessage,
  type RefillCandidate,
} from './refill';
import { isCronAuthorized } from './cron-auth';

const day = (d: number) => new Date(Date.UTC(2026, 9, d));

const candidate = (over: Partial<RefillCandidate> = {}): RefillCandidate => ({
  orderId: 1,
  number: 'LB-20260920-AAAA',
  userId: 10,
  telegramId: 555n,
  locale: 'uz',
  createdAt: day(1),
  deliveredAt: day(2),
  products: [{ slug: 'ambre-prive', name: 'Ambre Privé' }],
  ...over,
});

describe('pickRefillReminders', () => {
  const none = { lastOrderAt: new Map<number, Date>(), recentlyReminded: new Set<number>() };

  it('reminds a buyer who has not ordered again', () => {
    expect(pickRefillReminders([candidate()], none)).toHaveLength(1);
  });

  it('skips a buyer who ordered again, or who was reminded lately', () => {
    expect(
      pickRefillReminders([candidate()], { ...none, lastOrderAt: new Map([[10, day(15)]]) }),
    ).toEqual([]);
    expect(
      pickRefillReminders([candidate()], { ...none, recentlyReminded: new Set([10]) }),
    ).toEqual([]);
  });

  it('counts the order itself as the latest one', () => {
    expect(
      pickRefillReminders([candidate()], { ...none, lastOrderAt: new Map([[10, day(1)]]) }),
    ).toHaveLength(1);
  });

  it('sends one reminder per person, for the latest delivery, and skips sample-only orders', () => {
    const picked = pickRefillReminders(
      [
        candidate({ orderId: 1, deliveredAt: day(2) }),
        candidate({ orderId: 2, deliveredAt: day(4), createdAt: day(1) }),
        candidate({ orderId: 3, userId: 11, products: [] }),
      ],
      none,
    );
    expect(picked.map((c) => c.orderId)).toEqual([2]);
  });

  it('caps a run', () => {
    const many = Array.from({ length: 5 }, (_, i) => candidate({ orderId: i, userId: i }));
    expect(pickRefillReminders(many, none, 3)).toHaveLength(3);
  });
});

describe('refillMessage', () => {
  it('links each perfume with the reminder tags, in the customer’s language, with /stop', () => {
    const text = refillMessage(candidate());
    expect(text).toContain('LB-20260920-AAAA buyurtmangizga');
    expect(text).toContain(
      '• Ambre Privé — https://laborparfum.com/uz/product/ambre-prive?utm_source=telegram&utm_medium=reminder&utm_campaign=refill',
    );
    expect(text).toContain('/stop');
  });

  it('lists at most three perfumes', () => {
    const products = Array.from({ length: 5 }, (_, i) => ({ slug: `p${i}`, name: `P${i}` }));
    expect(refillMessage(candidate({ products })).match(/^• /gm)).toHaveLength(3);
  });
});

describe('refillDays', () => {
  it('takes a sane number of days and falls back to the default', () => {
    expect(refillDays('30')).toBe(30);
    expect(refillDays(undefined)).toBe(REFILL_DEFAULT_DAYS);
    expect(refillDays('3')).toBe(REFILL_DEFAULT_DAYS);
    expect(refillDays('25.5')).toBe(REFILL_DEFAULT_DAYS);
  });
});

describe('isCronAuthorized', () => {
  const secret = 'x'.repeat(32);

  it('accepts only the exact bearer secret', () => {
    expect(isCronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(isCronAuthorized(`Bearer ${secret}y`, secret)).toBe(false);
    expect(isCronAuthorized(secret, secret)).toBe(false);
    expect(isCronAuthorized(null, secret)).toBe(false);
  });

  it('stays shut without a long enough secret', () => {
    expect(isCronAuthorized('Bearer short', 'short')).toBe(false);
    expect(isCronAuthorized('Bearer ', undefined)).toBe(false);
  });
});
