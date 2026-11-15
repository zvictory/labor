import { describe, expect, it } from 'vitest';
import { catalogHref } from './filter-query';

describe('catalog filter links', () => {
  it('retains search, perfumer, legacy price sort and repeated campaign values when removing one filter', () => {
    const href = catalogHref(
      'ru',
      {
        brand: 'dior',
        note: 'rose',
        q: 'oud',
        perfumer: 'jean',
        sort: 'price_desc',
        page: '4',
        campaign: ['a', 'b'],
      },
      { brand: null, page: null },
    );
    const { searchParams } = new URL(href, 'https://labor.local');
    expect(searchParams.has('brand')).toBe(false);
    expect(searchParams.has('page')).toBe(false);
    expect(Object.fromEntries(searchParams)).toMatchObject({
      note: 'rose',
      q: 'oud',
      perfumer: 'jean',
      sort: 'price_desc',
    });
    expect(searchParams.getAll('campaign')).toEqual(['a', 'b']);
  });
});
