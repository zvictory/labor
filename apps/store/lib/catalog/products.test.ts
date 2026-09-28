import { afterAll, describe, expect, it } from 'vitest';

import { db } from '@/lib/db';

import { listProducts } from './products';

// These run against the database in DATABASE_URL (the local labor_store) and only
// read from it.
//
// Customers type a name the way they type everything on a phone, in lower case,
// while the catalogue stores it capitalised: "ombre" found nothing where "Ombre"
// found Ombre Nomade, and "гель" nothing where "Гель" found sixteen shower gels.
describe('listProducts({ q })', () => {
  afterAll(() => db.$disconnect());

  it.each(['ombre', 'OMBRE', 'oMbRe nOmAdE'])('finds Ombre Nomade from %j', async (q) => {
    const { data } = await listProducts({ locale: 'ru', q });
    expect(data.map((product) => product.slug)).toContain('ombre-nomade');
  });

  it('finds as much from a lower-case Cyrillic query as from the stored spelling', async () => {
    const [lower, asStored] = await Promise.all([
      listProducts({ locale: 'ru', q: 'гель' }),
      listProducts({ locale: 'ru', q: 'Гель' }),
    ]);
    expect(asStored.meta.total).toBeGreaterThan(0);
    expect(lower.meta.total).toBe(asStored.meta.total);
  });

  it('reads % and _ in a query as characters, not as wildcards', async () => {
    const { meta } = await listProducts({ locale: 'ru', q: '%_%' });
    expect(meta.total).toBe(0);
  });
});
