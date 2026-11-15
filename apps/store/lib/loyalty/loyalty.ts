// The loyalty ledger in the database. Every change to a member's bonus runs in a
// transaction that first locks the member's account row, so two tills, or a till
// and the checkout, can never spend the same bonus twice. The arithmetic is in
// lib/loyalty/rules.ts.

import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import {
  addDays,
  availableBalance,
  BIRTHDAY_BONUS_DAYS,
  BONUS_LIFETIME_DAYS,
  computeLots,
  earnFor,
  EXPIRY_NOTICE_DAYS,
  isBirthday,
  lotsExpiringSoon,
  lotsToExpire,
  makeCardNumber,
  maxSpend,
  nextTier,
  spendLast12Months,
  tashkentYear,
  tierFor,
  type LedgerEntry,
  type Lot,
  type Tier,
} from '@/lib/loyalty/rules';

type Tx = Prisma.TransactionClient;

export class LoyaltyError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'LoyaltyError';
  }
}

const entrySelect = {
  id: true,
  kind: true,
  amount: true,
  purchaseAmount: true,
  expiresAt: true,
  lotId: true,
  createdAt: true,
} satisfies Prisma.LoyaltyEntrySelect;

export interface LoyaltyState {
  accountId: number;
  cardNumber: string;
  tier: Tier;
  rate: number;
  spend12m: number;
  next: { tier: Tier; remaining: number } | null;
  available: number;
  expiringSoon: { amount: number; expiresAt: Date }[];
  lots: Lot[];
}

const stateOf = (
  account: { id: number; cardNumber: string },
  entries: readonly LedgerEntry[],
  now: Date,
): LoyaltyState => {
  const lots = computeLots(entries);
  const spend12m = spendLast12Months(entries, now);
  const rule = tierFor(spend12m);
  const next = nextTier(spend12m);
  return {
    accountId: account.id,
    cardNumber: account.cardNumber,
    tier: rule.tier,
    rate: rule.rate,
    spend12m,
    next: next ? { tier: next.rule.tier, remaining: next.remaining } : null,
    available: availableBalance(lots, now),
    expiringSoon: lotsExpiringSoon(lots, now).map((l) => ({
      amount: l.remaining,
      expiresAt: l.expiresAt,
    })),
    lots,
  };
};

/** Lock the account row until the transaction ends. */
const lock = async (tx: Tx, accountId: number): Promise<void> => {
  await tx.$queryRaw`SELECT id FROM "LoyaltyAccount" WHERE id = ${accountId} FOR UPDATE`;
};

const loadState = async (tx: Tx, accountId: number, now: Date): Promise<LoyaltyState> => {
  const account = await tx.loyaltyAccount.findUniqueOrThrow({
    where: { id: accountId },
    select: { id: true, cardNumber: true, entries: { select: entrySelect } },
  });
  return stateOf(account, account.entries, now);
};

/** A member's state, read without locking. */
export const getLoyaltyState = async (
  accountId: number,
  now: Date = new Date(),
): Promise<LoyaltyState> => loadState(db, accountId, now);

/** The member account of a user, created on first use with a fresh card number. */
export const ensureAccount = async (
  userId: number,
  client: Tx = db,
): Promise<{ id: number; cardNumber: string }> => {
  const existing = await client.loyaltyAccount.findUnique({
    where: { userId },
    select: { id: true, cardNumber: true },
  });
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await client.loyaltyAccount.create({
        data: { userId, cardNumber: makeCardNumber() },
        select: { id: true, cardNumber: true },
      });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      // Either the card number or the user was taken meanwhile: look again.
      const raced = await client.loyaltyAccount.findUnique({
        where: { userId },
        select: { id: true, cardNumber: true },
      });
      if (raced) return raced;
    }
  }
  throw new LoyaltyError('card_number_exhausted');
};

/** The member a placed order belongs to: its account, or the account with its phone. */
const memberUserId = async (
  tx: Tx,
  order: { userId: number | null; phone: string | null },
): Promise<number | null> => {
  if (order.userId) return order.userId;
  if (!order.phone) return null;
  const user = await tx.user.findUnique({ where: { phone: order.phone }, select: { id: true } });
  return user?.id ?? null;
};

// ── orders ──────────────────────────────────────────────────────────────────

/**
 * The bonus an order being placed will use: as much as the 30% limit and the
 * balance allow. Locks the member's account for the rest of the transaction,
 * so the order and its spend row are written against the same balance.
 */
export const bonusForOrder = async (
  tx: Tx,
  input: { userId: number; itemsTotal: number; now: Date },
): Promise<{ accountId: number; amount: number }> => {
  const account = await ensureAccount(input.userId, tx);
  await lock(tx, account.id);
  const state = await loadState(tx, account.id, input.now);
  return { accountId: account.id, amount: maxSpend(input.itemsTotal, state.available) };
};

/** The spend row of a placed order, written in the transaction that locked the account. */
export const recordOrderSpend = async (
  tx: Tx,
  input: { accountId: number; orderId: number; amount: number },
): Promise<void> => {
  if (input.amount <= 0) return;
  await tx.loyaltyEntry.create({
    data: {
      accountId: input.accountId,
      kind: 'spend',
      amount: -input.amount,
      orderId: input.orderId,
    },
  });
};

/**
 * Give back the bonus a canceled order used, once. A new lot: the customer gets
 * the full lifetime again rather than the remainder of the old one.
 */
export const refundForOrder = async (tx: Tx, orderId: number, now: Date): Promise<number> => {
  const spend = await tx.loyaltyEntry.findUnique({
    where: { orderId_kind: { orderId, kind: 'spend' } },
    select: { accountId: true, amount: true },
  });
  if (!spend) return 0;
  const done = await tx.loyaltyEntry.findUnique({
    where: { orderId_kind: { orderId, kind: 'refund' } },
    select: { id: true },
  });
  if (done) return 0;
  await tx.loyaltyEntry.create({
    data: {
      accountId: spend.accountId,
      kind: 'refund',
      amount: -spend.amount,
      orderId,
      expiresAt: addDays(now, BONUS_LIFETIME_DAYS),
    },
  });
  return -spend.amount;
};

/**
 * Credit the bonus for a delivered order, once, at the tier the member had
 * before it. What counts is what was paid for the items: the lines less the
 * sets, the promo code and the bonus used. Returns who to tell, or null.
 */
export const earnForOrder = async (
  tx: Tx,
  orderId: number,
  now: Date,
): Promise<{ userId: number; amount: number; balance: number } | null> => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      phone: true,
      discount: true,
      setDiscount: true,
      bonusSpent: true,
      items: { select: { unitPrice: true, quantity: true } },
    },
  });
  if (!order) return null;
  const userId = await memberUserId(tx, order);
  if (!userId) return null;

  const lines = order.items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const paid = Math.max(0, lines - order.setDiscount - order.discount - order.bonusSpent);
  const account = await ensureAccount(userId, tx);
  await lock(tx, account.id);
  const already = await tx.loyaltyEntry.findUnique({
    where: { orderId_kind: { orderId, kind: 'earn' } },
    select: { id: true },
  });
  if (already) return null;

  const before = await loadState(tx, account.id, now);
  const amount = earnFor(paid, before.tier);
  if (amount <= 0) return null;
  await tx.loyaltyEntry.create({
    data: {
      accountId: account.id,
      kind: 'earn',
      amount,
      purchaseAmount: paid,
      orderId,
      expiresAt: addDays(now, BONUS_LIFETIME_DAYS),
    },
  });
  return { userId, amount, balance: before.available + amount };
};

// ── the counter ─────────────────────────────────────────────────────────────

/** Purchases above this are refused at the counter; an admin enters them by hand. */
export const COUNTER_MAX_PURCHASE = 20_000_000;

/**
 * A purchase at a branch till: optional bonus used, then bonus earned on what
 * was paid in money. One transaction, so the two always go together.
 */
export const counterPurchase = async (input: {
  accountId: number;
  branch: string;
  purchase: number;
  spend: number;
  staffUserId: number;
  now?: Date;
}): Promise<{ earned: number; spent: number; balance: number }> => {
  const now = input.now ?? new Date();
  if (!Number.isInteger(input.purchase) || input.purchase <= 0) {
    throw new LoyaltyError('purchase_invalid');
  }
  if (input.purchase > COUNTER_MAX_PURCHASE) throw new LoyaltyError('purchase_too_large');
  if (!Number.isInteger(input.spend) || input.spend < 0) throw new LoyaltyError('bonus_invalid');

  return db.$transaction(async (tx) => {
    await lock(tx, input.accountId);
    const before = await loadState(tx, input.accountId, now);
    if (input.spend > maxSpend(input.purchase, before.available)) {
      throw new LoyaltyError('bonus_too_much');
    }
    const paid = input.purchase - input.spend;
    const earned = earnFor(paid, before.tier);
    const common = {
      accountId: input.accountId,
      branch: input.branch,
      staffUserId: input.staffUserId,
    };
    if (input.spend > 0) {
      await tx.loyaltyEntry.create({ data: { ...common, kind: 'spend', amount: -input.spend } });
    }
    if (earned > 0) {
      await tx.loyaltyEntry.create({
        data: {
          ...common,
          kind: 'earn',
          amount: earned,
          purchaseAmount: paid,
          expiresAt: addDays(now, BONUS_LIFETIME_DAYS),
        },
      });
    }
    return { earned, spent: input.spend, balance: before.available - input.spend + earned };
  });
};

/** An admin's correction, with a reason. A negative one cannot take more than is available. */
export const adjustBalance = async (input: {
  accountId: number;
  amount: number;
  note: string;
  staffUserId: number;
  now?: Date;
}): Promise<void> => {
  const now = input.now ?? new Date();
  if (!Number.isInteger(input.amount) || input.amount === 0)
    throw new LoyaltyError('amount_invalid');
  await db.$transaction(async (tx) => {
    await lock(tx, input.accountId);
    if (input.amount < 0) {
      const state = await loadState(tx, input.accountId, now);
      if (-input.amount > state.available) throw new LoyaltyError('bonus_too_much');
    }
    await tx.loyaltyEntry.create({
      data: {
        accountId: input.accountId,
        kind: 'adjust',
        amount: input.amount,
        note: input.note,
        staffUserId: input.staffUserId,
        ...(input.amount > 0 ? { expiresAt: addDays(now, BONUS_LIFETIME_DAYS) } : {}),
      },
    });
  });
};

// ── the daily run ───────────────────────────────────────────────────────────

export interface DailyRunResult {
  expiredLots: number;
  expiredAmount: number;
  birthdays: number;
  /** Who to tell, after the writes are committed. */
  notices: (
    | { kind: 'birthday'; userId: number; amount: number; until: Date }
    | { kind: 'expiring'; userId: number; amount: number; on: Date }
  )[];
}

/**
 * Close expired lots, give today's birthday bonuses, and collect the "expires
 * soon" notices (each lot is announced once). Safe to run more than once a day.
 */
export const runLoyaltyDay = async (now: Date = new Date()): Promise<DailyRunResult> => {
  const result: DailyRunResult = { expiredLots: 0, expiredAmount: 0, birthdays: 0, notices: [] };

  // Members with a lot that has expired or will within the notice window.
  const soon = addDays(now, EXPIRY_NOTICE_DAYS);
  const accounts = await db.loyaltyEntry.findMany({
    where: { amount: { gt: 0 }, expiresAt: { lte: soon }, kind: { not: 'expire' } },
    distinct: ['accountId'],
    select: { accountId: true, account: { select: { userId: true } } },
  });
  for (const { accountId, account } of accounts) {
    await db.$transaction(async (tx) => {
      await lock(tx, accountId);
      const state = await loadState(tx, accountId, now);
      for (const lot of lotsToExpire(state.lots, now)) {
        await tx.loyaltyEntry.create({
          data: { accountId, kind: 'expire', amount: -lot.remaining, lotId: lot.id },
        });
        result.expiredLots += 1;
        result.expiredAmount += lot.remaining;
      }
      const due = lotsExpiringSoon(state.lots, now).map((l) => l.id);
      if (due.length === 0) return;
      const claimed = await tx.loyaltyEntry.updateMany({
        where: { id: { in: due }, expiryNoticeAt: null },
        data: { expiryNoticeAt: now },
      });
      if (claimed.count === 0) return;
      const expiring = lotsExpiringSoon(state.lots, now);
      const amount = expiring.reduce((sum, l) => sum + l.remaining, 0);
      result.notices.push({
        kind: 'expiring',
        userId: account.userId,
        amount,
        on: expiring[0]!.expiresAt,
      });
    });
  }

  // Birthdays: users with a date of birth, checked in Tashkent's calendar.
  const year = tashkentYear(now);
  const people = await db.user.findMany({
    where: { birthDate: { not: null }, loyalty: { isNot: null } },
    select: { id: true, birthDate: true, loyalty: { select: { id: true } } },
  });
  for (const person of people) {
    if (!person.birthDate || !person.loyalty || !isBirthday(person.birthDate, now)) continue;
    const accountId = person.loyalty.id;
    const given = await db.$transaction(async (tx) => {
      await lock(tx, accountId);
      // One a year; the lock makes the check and the write one step.
      const done = await tx.loyaltyEntry.findUnique({
        where: { accountId_birthdayYear: { accountId, birthdayYear: year } },
        select: { id: true },
      });
      if (done) return 0;
      const state = await loadState(tx, accountId, now);
      const amount = tierFor(state.spend12m).birthdayBonus;
      await tx.loyaltyEntry.create({
        data: {
          accountId,
          kind: 'birthday',
          amount,
          birthdayYear: year,
          expiresAt: addDays(now, BIRTHDAY_BONUS_DAYS),
        },
      });
      return amount;
    });
    if (given > 0) {
      result.birthdays += 1;
      result.notices.push({
        kind: 'birthday',
        userId: person.id,
        amount: given,
        until: addDays(now, BIRTHDAY_BONUS_DAYS),
      });
    }
  }
  return result;
};
