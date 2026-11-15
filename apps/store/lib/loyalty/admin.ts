// The loyalty programme as the admin sees it: totals, the bonus Labor owes its
// members, recent moves, and one member in full.

import { db } from '@/lib/db';
import {
  addDays,
  availableBalance,
  computeLots,
  spendLast12Months,
  tierFor,
  type Tier,
} from '@/lib/loyalty/rules';

/** What staff call each kind of ledger row. */
export const KIND_LABEL: Record<string, string> = {
  earn: 'Начислено',
  spend: 'Списано',
  refund: 'Возврат',
  expire: 'Сгорело',
  adjust: 'Корректировка',
  birthday: 'День рождения',
};

const entrySelect = {
  id: true,
  kind: true,
  amount: true,
  purchaseAmount: true,
  expiresAt: true,
  lotId: true,
  createdAt: true,
} as const;

export interface LoyaltyOverview {
  members: number;
  withConsent: number;
  byTier: Record<Tier, number>;
  /** Unspent, unexpired bonus across all members: what Labor owes. */
  liability: number;
  last30: Record<string, number>;
  recent: {
    id: number;
    kind: string;
    amount: number;
    branch: string | null;
    note: string | null;
    createdAt: Date;
    cardNumber: string;
    memberName: string | null;
    staffName: string | null;
    orderNumber: string | null;
  }[];
}

export const getLoyaltyOverview = async (now: Date = new Date()): Promise<LoyaltyOverview> => {
  // Every member's ledger in one read. Fine for thousands of members; beyond
  // that, keep a running balance per account.
  const accounts = await db.loyaltyAccount.findMany({
    select: { marketingConsentAt: true, entries: { select: entrySelect } },
  });
  const byTier: Record<Tier, number> = { labor: 0, silver: 0, gold: 0 };
  let liability = 0;
  for (const a of accounts) {
    byTier[tierFor(spendLast12Months(a.entries, now)).tier] += 1;
    liability += availableBalance(computeLots(a.entries), now);
  }

  const sums = await db.loyaltyEntry.groupBy({
    by: ['kind'],
    where: { createdAt: { gte: addDays(now, -30) } },
    _sum: { amount: true },
  });
  const last30: Record<string, number> = {};
  for (const s of sums) last30[s.kind] = s._sum.amount ?? 0;

  const recent = await db.loyaltyEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      kind: true,
      amount: true,
      branch: true,
      note: true,
      createdAt: true,
      orderId: true,
      staffUserId: true,
      account: { select: { cardNumber: true, user: { select: { name: true } } } },
    },
  });
  const staffIds = [...new Set(recent.flatMap((r) => (r.staffUserId ? [r.staffUserId] : [])))];
  const orderIds = [...new Set(recent.flatMap((r) => (r.orderId ? [r.orderId] : [])))];
  const [staff, orders] = await Promise.all([
    db.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, name: true, email: true },
    }),
    db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, number: true } }),
  ]);
  const staffName = new Map(staff.map((s) => [s.id, s.name ?? s.email ?? `#${s.id}`]));
  const orderNumber = new Map(orders.map((o) => [o.id, o.number]));

  return {
    members: accounts.length,
    withConsent: accounts.filter((a) => a.marketingConsentAt).length,
    byTier,
    liability,
    last30,
    recent: recent.map((r) => ({
      id: r.id,
      kind: r.kind,
      amount: r.amount,
      branch: r.branch,
      note: r.note,
      createdAt: r.createdAt,
      cardNumber: r.account.cardNumber,
      memberName: r.account.user.name,
      staffName: r.staffUserId ? (staffName.get(r.staffUserId) ?? null) : null,
      orderNumber: r.orderId ? (orderNumber.get(r.orderId) ?? null) : null,
    })),
  };
};

export const getMemberByCard = async (cardNumber: string) =>
  db.loyaltyAccount.findUnique({
    where: { cardNumber },
    select: {
      id: true,
      cardNumber: true,
      marketingConsentAt: true,
      marketingConsentSource: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          telegramId: true,
          birthDate: true,
          preferredLocale: true,
        },
      },
      entries: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          kind: true,
          amount: true,
          purchaseAmount: true,
          branch: true,
          note: true,
          expiresAt: true,
          orderId: true,
          createdAt: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, text: true, status: true, channel: true, createdAt: true },
      },
    },
  });
