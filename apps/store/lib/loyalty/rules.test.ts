import { describe, expect, it } from 'vitest';

import {
  addDays,
  availableBalance,
  computeLots,
  earnFor,
  formatCardNumber,
  isBirthday,
  lotsExpiringSoon,
  lotsToExpire,
  makeCardNumber,
  maxSpend,
  nextTier,
  parseCardNumber,
  spendLast12Months,
  tierFor,
  type LedgerEntry,
} from '@/lib/loyalty/rules';

const T0 = new Date('2026-01-01T09:00:00Z');
let nextId = 1;
const entry = (
  kind: string,
  amount: number,
  createdAt: Date,
  extra: Partial<LedgerEntry> = {},
): LedgerEntry => ({
  id: nextId++,
  kind,
  amount,
  purchaseAmount: null,
  expiresAt: amount > 0 ? addDays(createdAt, 180) : null,
  lotId: null,
  createdAt,
  ...extra,
});

describe('tiers', () => {
  it('reaches silver at one million and gold at three', () => {
    expect(tierFor(0).tier).toBe('labor');
    expect(tierFor(999_999).tier).toBe('labor');
    expect(tierFor(1_000_000).tier).toBe('silver');
    expect(tierFor(3_000_000).tier).toBe('gold');
  });

  it('says what is left to the next tier, and nothing at the top', () => {
    expect(nextTier(400_000)).toMatchObject({ rule: { tier: 'silver' }, remaining: 600_000 });
    expect(nextTier(3_500_000)).toBeNull();
  });

  it('earns 3, 5 or 7 percent, rounded down', () => {
    expect(earnFor(160_000, 'labor')).toBe(4_800);
    expect(earnFor(160_000, 'silver')).toBe(8_000);
    expect(earnFor(160_001, 'gold')).toBe(11_200);
    expect(earnFor(0, 'gold')).toBe(0);
  });

  it('measures the tier on the last 12 months of earn rows', () => {
    const now = new Date('2026-12-01T00:00:00Z');
    const rows = [
      entry('earn', 30_000, new Date('2025-11-01T00:00:00Z'), { purchaseAmount: 1_000_000 }),
      entry('earn', 15_000, new Date('2026-06-01T00:00:00Z'), { purchaseAmount: 500_000 }),
      entry('birthday', 30_000, new Date('2026-07-01T00:00:00Z')),
    ];
    expect(spendLast12Months(rows, now)).toBe(500_000);
  });
});

describe('maxSpend', () => {
  it('is 30 percent of the items, never more than is available', () => {
    expect(maxSpend(160_000, 100_000)).toBe(48_000);
    expect(maxSpend(160_000, 10_000)).toBe(10_000);
    expect(maxSpend(160_000, 0)).toBe(0);
  });
});

describe('computeLots', () => {
  it('uses the lot that expires soonest first', () => {
    const a = entry('earn', 5_000, T0);
    const b = entry('birthday', 30_000, addDays(T0, 10), { expiresAt: addDays(T0, 40) });
    const spend = entry('spend', -20_000, addDays(T0, 20));
    const lots = computeLots([a, b, spend]);
    // b expires on day 40, a on day 180: b goes first.
    expect(lots.find((l) => l.id === b.id)?.remaining).toBe(10_000);
    expect(lots.find((l) => l.id === a.id)?.remaining).toBe(5_000);
    expect(availableBalance(lots, addDays(T0, 21))).toBe(15_000);
  });

  it('does not let a spend use a lot that had already expired', () => {
    const old = entry('earn', 10_000, T0, { expiresAt: addDays(T0, 5) });
    const fresh = entry('earn', 10_000, addDays(T0, 1));
    const spend = entry('spend', -4_000, addDays(T0, 6));
    const lots = computeLots([old, fresh, spend]);
    expect(lots.find((l) => l.id === old.id)?.remaining).toBe(10_000);
    expect(lots.find((l) => l.id === fresh.id)?.remaining).toBe(6_000);
  });

  it('counts an expired lot out of the balance and asks for its expire row once', () => {
    const lot = entry('earn', 10_000, T0, { expiresAt: addDays(T0, 5) });
    const after = addDays(T0, 6);
    let lots = computeLots([lot]);
    expect(availableBalance(lots, after)).toBe(0);
    expect(lotsToExpire(lots, after).map((l) => l.id)).toEqual([lot.id]);

    const closing = entry('expire', -10_000, after, { lotId: lot.id });
    lots = computeLots([lot, closing]);
    expect(lotsToExpire(lots, after)).toEqual([]);
  });

  it('expires only what is left of a lot', () => {
    const lot = entry('earn', 10_000, T0, { expiresAt: addDays(T0, 5) });
    const spend = entry('spend', -7_000, addDays(T0, 1));
    const lots = computeLots([lot, spend]);
    expect(lotsToExpire(lots, addDays(T0, 6))[0]?.remaining).toBe(3_000);
  });

  it('finds lots expiring within 14 days', () => {
    const soon = entry('earn', 1_000, T0, { expiresAt: addDays(T0, 10) });
    const later = entry('earn', 1_000, T0, { expiresAt: addDays(T0, 60) });
    expect(lotsExpiringSoon(computeLots([soon, later]), T0).map((l) => l.id)).toEqual([soon.id]);
  });

  it('gives a refund back as a new lot', () => {
    const earn = entry('earn', 10_000, T0);
    const spend = entry('spend', -10_000, addDays(T0, 1));
    const refund = entry('refund', 10_000, addDays(T0, 2));
    expect(availableBalance(computeLots([earn, spend, refund]), addDays(T0, 3))).toBe(10_000);
  });
});

describe('isBirthday', () => {
  const born = new Date('1990-03-08T00:00:00Z');

  it('is the same day and month in Tashkent', () => {
    expect(isBirthday(born, new Date('2026-03-08T06:00:00Z'))).toBe(true);
    // 21:00 UTC on 7 March is already 02:00 on 8 March in Tashkent.
    expect(isBirthday(born, new Date('2026-03-07T21:00:00Z'))).toBe(true);
    expect(isBirthday(born, new Date('2026-03-07T12:00:00Z'))).toBe(false);
  });

  it('gives a 29 February birthday on 28 February in other years', () => {
    const leapling = new Date('2000-02-29T00:00:00Z');
    expect(isBirthday(leapling, new Date('2027-02-28T06:00:00Z'))).toBe(true);
    expect(isBirthday(leapling, new Date('2028-02-28T06:00:00Z'))).toBe(false);
    expect(isBirthday(leapling, new Date('2028-02-29T06:00:00Z'))).toBe(true);
  });
});

describe('card numbers', () => {
  it('makes eight digits that pass their own check', () => {
    for (let i = 0; i < 50; i += 1) {
      const n = makeCardNumber();
      expect(n).toMatch(/^[1-9]\d{7}$/);
      expect(parseCardNumber(n)).toBe(n);
    }
  });

  it('reads spaces and dashes, and refuses a mistyped digit', () => {
    const n = makeCardNumber(() => 0.5);
    expect(parseCardNumber(`${n.slice(0, 4)} ${n.slice(4)}`)).toBe(n);
    const wrong = n.slice(0, 7) + String((Number(n[7]) + 1) % 10);
    expect(parseCardNumber(wrong)).toBeNull();
    expect(parseCardNumber('1234')).toBeNull();
  });

  it('is shown in two groups of four', () => {
    expect(formatCardNumber('48217730')).toBe('4821 7730');
  });
});
