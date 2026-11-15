// The Labor loyalty programme's arithmetic, free of I/O so the checkout, the
// branch page, the cron and the tests all apply the same rules. Storage lives
// in lib/loyalty/loyalty.ts; the plan is docs/plans/2026-11-15-sodiqlik-va-wallet-rejasi.md.
//
// The bonus is a ledger of signed entries. A positive entry (earn, refund,
// birthday, a positive adjust) is a lot with an expiry date; a negative entry
// (spend, expire, a negative adjust) uses lots up, the one expiring soonest
// first. Nothing is stored as a balance: it is always worked out from the rows.

export type Tier = 'labor' | 'silver' | 'gold';

export interface TierRule {
  tier: Tier;
  /** Spend over the last 12 months, in so'm, from which the tier applies. */
  from: number;
  /** Percent of what was paid that comes back as bonus. */
  rate: number;
  /** The birthday gift, in so'm. */
  birthdayBonus: number;
}

/** Lowest first. */
export const TIERS: readonly TierRule[] = [
  { tier: 'labor', from: 0, rate: 3, birthdayBonus: 30_000 },
  { tier: 'silver', from: 1_000_000, rate: 5, birthdayBonus: 50_000 },
  { tier: 'gold', from: 3_000_000, rate: 7, birthdayBonus: 100_000 },
];

/** Bonus may pay at most this percent of the items. */
export const MAX_SPEND_PERCENT = 30;
export const BONUS_LIFETIME_DAYS = 180;
export const BIRTHDAY_BONUS_DAYS = 30;
/** How long before a lot expires the member is told about it. */
export const EXPIRY_NOTICE_DAYS = 14;
/** The window the tier is measured over. */
export const TIER_WINDOW_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

export const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

export const tierRule = (tier: Tier): TierRule => TIERS.find((t) => t.tier === tier) ?? TIERS[0]!;

/** The tier a 12-month spend reaches. */
export const tierFor = (spend: number): TierRule =>
  [...TIERS].reverse().find((t) => spend >= t.from) ?? TIERS[0]!;

/** The next tier up and what is left to spend to reach it, or null at the top. */
export const nextTier = (spend: number): { rule: TierRule; remaining: number } | null => {
  const next = TIERS.find((t) => t.from > spend);
  return next ? { rule: next, remaining: next.from - spend } : null;
};

/** Bonus earned on a purchase: the tier's percent of what was paid, rounded down. */
export const earnFor = (paid: number, tier: Tier): number =>
  paid > 0 ? Math.floor((paid * tierRule(tier).rate) / 100) : 0;

/** The most bonus an order of `itemsTotal` may use, given what is available. */
export const maxSpend = (itemsTotal: number, available: number): number =>
  Math.max(0, Math.min(available, Math.floor((itemsTotal * MAX_SPEND_PERCENT) / 100)));

export interface LedgerEntry {
  id: number;
  kind: string;
  amount: number;
  purchaseAmount: number | null;
  expiresAt: Date | null;
  lotId: number | null;
  createdAt: Date;
}

export interface Lot {
  id: number;
  kind: string;
  amount: number;
  remaining: number;
  expiresAt: Date;
  createdAt: Date;
  /** An expire row already closes this lot. */
  closed: boolean;
}

/**
 * Every lot with what is left of it. Negative entries are applied in the order
 * they were made, each to the lots that were open at that moment, the one
 * expiring soonest first; an expire entry closes the lot it names.
 */
export const computeLots = (entries: readonly LedgerEntry[]): Lot[] => {
  const sorted = [...entries].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id,
  );
  const lots: Lot[] = [];
  const byId = new Map<number, Lot>();

  for (const entry of sorted) {
    if (entry.amount > 0 && entry.kind !== 'expire') {
      const lot: Lot = {
        id: entry.id,
        kind: entry.kind,
        amount: entry.amount,
        remaining: entry.amount,
        expiresAt: entry.expiresAt ?? addDays(entry.createdAt, BONUS_LIFETIME_DAYS),
        createdAt: entry.createdAt,
        closed: false,
      };
      lots.push(lot);
      byId.set(lot.id, lot);
      continue;
    }
    if (entry.amount >= 0) continue;

    if (entry.kind === 'expire' && entry.lotId !== null) {
      const lot = byId.get(entry.lotId);
      if (lot) {
        lot.remaining = Math.max(0, lot.remaining + entry.amount);
        lot.closed = true;
      }
      continue;
    }

    let owed = -entry.amount;
    const open = lots
      .filter((l) => l.remaining > 0 && !l.closed && l.expiresAt > entry.createdAt)
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime() || a.id - b.id);
    for (const lot of open) {
      if (owed === 0) break;
      const take = Math.min(lot.remaining, owed);
      lot.remaining -= take;
      owed -= take;
    }
  }
  return lots;
};

/** What can be spent now: the open lots that have not expired. */
export const availableBalance = (lots: readonly Lot[], now: Date): number =>
  lots.reduce((sum, l) => sum + (!l.closed && l.expiresAt > now ? l.remaining : 0), 0);

/** Lots past their date with bonus still in them: the cron writes an expire row for each. */
export const lotsToExpire = (lots: readonly Lot[], now: Date): Lot[] =>
  lots.filter((l) => !l.closed && l.remaining > 0 && l.expiresAt <= now);

/** Open lots that expire within the notice window, soonest first. */
export const lotsExpiringSoon = (lots: readonly Lot[], now: Date): Lot[] =>
  lots
    .filter(
      (l) =>
        !l.closed &&
        l.remaining > 0 &&
        l.expiresAt > now &&
        l.expiresAt <= addDays(now, EXPIRY_NOTICE_DAYS),
    )
    .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());

/** What was paid over the last 12 months, from the earn rows: the tier is measured on it. */
export const spendLast12Months = (entries: readonly LedgerEntry[], now: Date): number => {
  const since = addDays(now, -TIER_WINDOW_DAYS);
  return entries.reduce(
    (sum, e) =>
      sum + (e.kind === 'earn' && e.createdAt > since && e.purchaseAmount ? e.purchaseAmount : 0),
    0,
  );
};

/**
 * Whether the birthday bonus is due on `now` for someone born on `birthDate`,
 * in Tashkent's calendar. Someone born on 29 February gets it on 28 February
 * in other years.
 */
export const isBirthday = (birthDate: Date, now: Date): boolean => {
  const tashkent = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const month = tashkent.getUTCMonth();
  const day = tashkent.getUTCDate();
  const bMonth = birthDate.getUTCMonth();
  const bDay = birthDate.getUTCDate();
  if (bMonth === month && bDay === day) return true;
  const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return (
    bMonth === 1 && bDay === 29 && month === 1 && day === 28 && !leap(tashkent.getUTCFullYear())
  );
};

/** The calendar year in Tashkent, which names a birthday entry. */
export const tashkentYear = (now: Date): number =>
  new Date(now.getTime() + 5 * 60 * 60 * 1000).getUTCFullYear();

// ── card numbers ─────────────────────────────────────────────────────────────

/** The Luhn check digit for a string of digits. */
export const luhnDigit = (digits: string): number => {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
};

/** A new card number: seven random digits, not starting with 0, and a check digit. */
export const makeCardNumber = (random: () => number = Math.random): string => {
  let body = String(1 + Math.floor(random() * 9));
  while (body.length < 7) body += String(Math.floor(random() * 10));
  return body + String(luhnDigit(body));
};

/** The digits of a typed or scanned card number, or null when it is not one. */
export const parseCardNumber = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, '');
  if (!/^[1-9]\d{7}$/.test(digits)) return null;
  return luhnDigit(digits.slice(0, 7)) === Number(digits[7]) ? digits : null;
};

/** "4821 7730". */
export const formatCardNumber = (digits: string): string =>
  digits.length === 8 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
