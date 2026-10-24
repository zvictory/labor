import { describe, expect, it } from 'vitest';

import { mergeSourceRows } from './source-report';

const key = (utmSource: string | null, utmCampaign: string | null = null) => ({
  utmSource,
  utmMedium: utmSource ? 'paid' : null,
  utmCampaign,
});

describe('mergeSourceRows', () => {
  it('puts orders, paid orders and requests of one source on one row', () => {
    const rows = mergeSourceRows(
      [
        { ...key('instagram', '2plus1'), _count: { _all: 3 }, _sum: { total: 900_000 } },
        { ...key(null), _count: { _all: 1 }, _sum: { total: 100_000 } },
      ],
      [{ ...key('instagram', '2plus1'), _count: { _all: 2 }, _sum: { total: 600_000 } }],
      [
        { ...key('instagram', '2plus1'), _count: { _all: 4 } },
        { ...key('telegram'), _count: { _all: 2 } },
      ],
    );
    expect(rows).toEqual([
      {
        ...key('instagram', '2plus1'),
        orders: 3,
        revenue: 900_000,
        paidOrders: 2,
        paidRevenue: 600_000,
        leads: 4,
      },
      { ...key(null), orders: 1, revenue: 100_000, paidOrders: 0, paidRevenue: 0, leads: 0 },
      { ...key('telegram'), orders: 0, revenue: 0, paidOrders: 0, paidRevenue: 0, leads: 2 },
    ]);
  });
});
