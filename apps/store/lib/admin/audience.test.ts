import { describe, expect, it } from 'vitest';

import { buildAudienceCsv, buyersFromOrders, leadsFromRequests } from './audience';

const order = (over: Partial<Parameters<typeof buyersFromOrders>[0][number]> = {}) => ({
  phone: '+998901234567',
  total: 300_000,
  status: 'delivered',
  paymentStatus: 'unpaid',
  user: null,
  ...over,
});

describe('buyersFromOrders', () => {
  it('merges a buyer’s orders by phone and counts only money taken', () => {
    const rows = buyersFromOrders([
      order({ user: { email: 'dilnoza@example.com', name: 'Dilnoza Karimova', phone: null } }),
      order({ phone: '90 123 45 67', status: 'pending', total: 500_000 }),
      order({ phone: '+998935550000', status: 'confirmed', paymentStatus: 'paid', total: 900_000 }),
      order({ phone: '+998977777777', status: 'canceled' }),
      order({ phone: 'garbage' }),
    ]);
    expect(rows).toEqual([
      { phone: '998935550000', email: null, firstName: null, value: 900_000 },
      { phone: '998901234567', email: 'dilnoza@example.com', firstName: 'Dilnoza', value: 300_000 },
    ]);
  });

  it('leaves out synthesized Telegram addresses', () => {
    const [row] = buyersFromOrders([
      order({ user: { email: 'tg_42@labor.local', name: null, phone: null } }),
    ]);
    expect(row?.email).toBeNull();
  });
});

describe('leadsFromRequests', () => {
  it('keeps one row per number and drops people who already bought', () => {
    expect(
      leadsFromRequests(
        [
          { phone: '+998901234567', name: 'Aziz' },
          { phone: '+998911112233', name: 'Kamola Y.' },
          { phone: '+998911112233', name: null },
        ],
        new Set(['998901234567']),
      ),
    ).toEqual([{ phone: '998911112233', email: null, firstName: 'Kamola', value: null }]);
  });
});

describe('buildAudienceCsv', () => {
  it('writes Meta’s customer-list columns', () => {
    expect(
      buildAudienceCsv(
        [{ phone: '998901234567', email: null, firstName: '=cmd', value: 300_000 }],
        'buyers',
      ),
    ).toBe('phone,email,fn,country,value\r\n"998901234567","","\'=cmd","UZ","300000"\r\n');
    expect(
      buildAudienceCsv(
        [{ phone: '998911112233', email: null, firstName: null, value: null }],
        'leads',
      ),
    ).toBe('phone,fn,country\r\n"998911112233","","UZ"\r\n');
  });
});
