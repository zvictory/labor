import { describe, expect, it } from 'vitest';

import {
  applySampleSets,
  setOffer,
  setProblem,
  setSaving,
  type SampleSetRule,
} from '@/lib/sets/rules';

const SAMPLE = 32_000;

const winter: SampleSetRule = {
  slug: 'winter',
  title: 'Winter',
  price: 85_000,
  productIds: [1, 2, 3],
};

const qty = (entries: [number, number][]) => new Map(entries);

describe('setSaving', () => {
  it('is the gap between the samples bought singly and the set price', () => {
    expect(setSaving(winter, SAMPLE)).toBe(3 * SAMPLE - 85_000);
  });

  it('is 0 when the set costs as much as its samples, or more', () => {
    expect(setSaving({ ...winter, price: 96_000 }, SAMPLE)).toBe(0);
    expect(setSaving({ ...winter, price: 120_000 }, SAMPLE)).toBe(0);
  });

  it('is 0 for a set of one perfume, of more than ten, or with no price', () => {
    expect(setSaving({ price: 20_000, productIds: [1] }, SAMPLE)).toBe(0);
    expect(
      setSaving({ price: 100_000, productIds: Array.from({ length: 11 }, (_, i) => i) }, SAMPLE),
    ).toBe(0);
    expect(setSaving({ ...winter, price: 0 }, SAMPLE)).toBe(0);
  });

  it('counts a perfume listed twice once', () => {
    expect(setSaving({ price: 50_000, productIds: [1, 1, 2] }, SAMPLE)).toBe(2 * SAMPLE - 50_000);
  });
});

describe('setProblem and setOffer', () => {
  const on = (ids: number[]) => ids.map((productId) => ({ productId, active: true }));

  it('offers the set when the price saves something on 2–10 perfumes on sale', () => {
    expect(setProblem(85_000, on([1, 2, 3]), SAMPLE)).toBeNull();
    expect(setOffer(85_000, on([1, 2, 3]), SAMPLE)).toEqual({
      price: 85_000,
      regular: 96_000,
      saving: 11_000,
      productIds: [1, 2, 3],
    });
  });

  it('names what is in the way', () => {
    expect(setProblem(null, on([1, 2, 3]), SAMPLE)).toBe('no_price');
    expect(setProblem(0, on([1, 2, 3]), SAMPLE)).toBe('no_price');
    expect(setProblem(20_000, on([1]), SAMPLE)).toBe('too_few');
    expect(setProblem(100_000, on(Array.from({ length: 11 }, (_, i) => i + 1)), SAMPLE)).toBe(
      'too_many',
    );
    expect(setProblem(85_000, [...on([1, 2]), { productId: 3, active: false }], SAMPLE)).toBe(
      'product_off',
    );
    expect(setProblem(96_000, on([1, 2, 3]), SAMPLE)).toBe('no_saving');
  });

  it('offers nothing while there is a problem', () => {
    expect(setOffer(null, on([1, 2, 3]), SAMPLE)).toBeNull();
    expect(setOffer(96_000, on([1, 2, 3]), SAMPLE)).toBeNull();
    expect(setOffer(85_000, [...on([1, 2]), { productId: 3, active: false }], SAMPLE)).toBeNull();
  });
});

describe('applySampleSets', () => {
  it('takes the saving off once the whole set is in the cart', () => {
    const result = applySampleSets(
      [winter],
      qty([
        [1, 1],
        [2, 1],
        [3, 1],
      ]),
      SAMPLE,
    );
    expect(result.discount).toBe(11_000);
    expect(result.applied).toEqual([{ slug: 'winter', title: 'Winter', count: 1, saving: 11_000 }]);
  });

  it('takes nothing off while a perfume of the set is missing', () => {
    const result = applySampleSets(
      [winter],
      qty([
        [1, 2],
        [2, 1],
      ]),
      SAMPLE,
    );
    expect(result).toEqual({ discount: 0, applied: [] });
  });

  it('counts as many sets as the scarcest sample allows', () => {
    const result = applySampleSets(
      [winter],
      qty([
        [1, 3],
        [2, 2],
        [3, 5],
      ]),
      SAMPLE,
    );
    expect(result.applied[0]?.count).toBe(2);
    expect(result.discount).toBe(22_000);
  });

  it('leaves samples outside any set at their own price', () => {
    const result = applySampleSets(
      [winter],
      qty([
        [1, 1],
        [2, 1],
        [3, 1],
        [9, 4],
      ]),
      SAMPLE,
    );
    expect(result.discount).toBe(11_000);
  });

  it('uses a shared sample for the set that saves more', () => {
    const pair: SampleSetRule = { slug: 'pair', title: 'Pair', price: 60_000, productIds: [3, 4] };
    const result = applySampleSets(
      [pair, winter],
      qty([
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 1],
      ]),
      SAMPLE,
    );
    // winter saves 11 000, the pair 4 000; perfume 3 is in the cart once.
    expect(result.applied.map((s) => s.slug)).toEqual(['winter']);
    expect(result.discount).toBe(11_000);
  });

  it('applies two sets when the cart holds enough for both', () => {
    const pair: SampleSetRule = { slug: 'pair', title: 'Pair', price: 60_000, productIds: [3, 4] };
    const result = applySampleSets(
      [winter, pair],
      qty([
        [1, 1],
        [2, 1],
        [3, 2],
        [4, 1],
      ]),
      SAMPLE,
    );
    expect(result.discount).toBe(11_000 + 4_000);
  });

  it('ignores sets that save nothing', () => {
    const result = applySampleSets(
      [{ ...winter, price: 96_000 }],
      qty([
        [1, 1],
        [2, 1],
        [3, 1],
      ]),
      SAMPLE,
    );
    expect(result).toEqual({ discount: 0, applied: [] });
  });
});
