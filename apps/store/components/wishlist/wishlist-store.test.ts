import { describe, expect, it } from 'vitest';

import { parseStoredIds } from './wishlist-store';

describe('parseStoredIds', () => {
  it('reads a stored list of product ids', () => {
    expect(parseStoredIds('[3,1,2]')).toEqual([3, 1, 2]);
  });

  it('drops duplicates and anything that is not a positive integer', () => {
    expect(parseStoredIds('[1,1,"2",-3,0,4.5,null,5]')).toEqual([1, 5]);
  });

  it('reads nothing from missing, malformed or non-array values', () => {
    expect(parseStoredIds(null)).toEqual([]);
    expect(parseStoredIds('{oops')).toEqual([]);
    expect(parseStoredIds('{"a":1}')).toEqual([]);
  });

  it('caps the list', () => {
    const many = JSON.stringify(Array.from({ length: 250 }, (_, i) => i + 1));
    expect(parseStoredIds(many)).toHaveLength(200);
  });
});
