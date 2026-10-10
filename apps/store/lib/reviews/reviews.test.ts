import { describe, expect, it } from 'vitest';

import { reviewInputSchema, reviewerName, summarizeRatings } from './reviews';

describe('summarizeRatings', () => {
  it('averages to one decimal', () => {
    expect(summarizeRatings([5, 4, 4])).toEqual({ average: 4.3, count: 3 });
  });

  it('leaves out missing and out-of-range ratings', () => {
    expect(summarizeRatings([5, null, 0, 9, 3.5])).toEqual({ average: 5, count: 1 });
  });

  it('is empty without ratings', () => {
    expect(summarizeRatings([])).toEqual({ average: 0, count: 0 });
  });
});

describe('reviewerName', () => {
  it('signs with the first name only', () => {
    expect(reviewerName('  Dilnoza Karimova ')).toBe('Dilnoza');
  });

  it('has no name when the account has none', () => {
    expect(reviewerName(null)).toBeNull();
    expect(reviewerName('   ')).toBeNull();
  });
});

describe('reviewInputSchema', () => {
  it('takes a 1–5 rating and an optional text', () => {
    expect(reviewInputSchema.parse({ rating: '4', comment: '  Стойкий  ' })).toEqual({
      rating: 4,
      comment: 'Стойкий',
    });
    expect(reviewInputSchema.parse({ rating: 5, comment: '' })).toEqual({
      rating: 5,
      comment: null,
    });
  });

  it('refuses ratings outside 1–5 and over-long texts', () => {
    expect(reviewInputSchema.safeParse({ rating: 0, comment: '' }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ rating: 6, comment: '' }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ rating: 5, comment: 'x'.repeat(1501) }).success).toBe(
      false,
    );
  });
});
