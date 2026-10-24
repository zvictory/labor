// Orders, revenue and "help me choose" requests per ad source, for the admin
// "Источники" page. Grouped by the utm tags the visitor arrived with
// (lib/attribution); untagged visits make one "direct" row.

import { db } from '@/lib/db';

export const REPORT_PERIODS = [7, 30, 90] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export interface SourceKey {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

export interface SourceRow extends SourceKey {
  orders: number;
  /** Sum of order totals, canceled orders left out. */
  revenue: number;
  /** Orders that are paid or delivered, and their totals. */
  paidOrders: number;
  paidRevenue: number;
  leads: number;
}

type OrderGroup = SourceKey & { _count: { _all: number }; _sum: { total: number | null } };
type LeadGroup = SourceKey & { _count: { _all: number } };

const keyOf = (k: SourceKey): string => JSON.stringify([k.utmSource, k.utmMedium, k.utmCampaign]);

/**
 * One row per source/medium/campaign, the busiest by revenue first and then
 * by requests. Pure, so it is tested without a database.
 */
export const mergeSourceRows = (
  orders: readonly OrderGroup[],
  paid: readonly OrderGroup[],
  leads: readonly LeadGroup[],
): SourceRow[] => {
  const rows = new Map<string, SourceRow>();
  const row = (k: SourceKey): SourceRow => {
    const key = keyOf(k);
    let r = rows.get(key);
    if (!r) {
      r = {
        utmSource: k.utmSource,
        utmMedium: k.utmMedium,
        utmCampaign: k.utmCampaign,
        orders: 0,
        revenue: 0,
        paidOrders: 0,
        paidRevenue: 0,
        leads: 0,
      };
      rows.set(key, r);
    }
    return r;
  };
  for (const g of orders) {
    const r = row(g);
    r.orders += g._count._all;
    r.revenue += g._sum.total ?? 0;
  }
  for (const g of paid) {
    const r = row(g);
    r.paidOrders += g._count._all;
    r.paidRevenue += g._sum.total ?? 0;
  }
  for (const g of leads) row(g).leads += g._count._all;
  return [...rows.values()].sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);
};

const BY = ['utmSource', 'utmMedium', 'utmCampaign'] as const;

export const getSourceReport = async (days: ReportPeriod, now: Date = new Date()) => {
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const placed = { createdAt: { gte: since }, status: { not: 'canceled' } };
  const [orders, paid, leads] = await Promise.all([
    db.order.groupBy({ by: [...BY], where: placed, _count: { _all: true }, _sum: { total: true } }),
    db.order.groupBy({
      by: [...BY],
      where: { ...placed, OR: [{ paymentStatus: 'paid' }, { status: 'delivered' }] },
      _count: { _all: true },
      _sum: { total: true },
    }),
    db.consultRequest.groupBy({
      by: [...BY],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);
  return mergeSourceRows(orders, paid, leads);
};
