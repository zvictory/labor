import { describe, expect, it } from 'vitest';

import { formatUzs } from './money';

const NBSP = ' ';

describe('formatUzs', () => {
  it('prints the local word for the currency in ru and uz', () => {
    expect(formatUzs(160_000, 'ru')).toBe(`160${NBSP}000${NBSP}сум`);
    expect(formatUzs(160_000, 'uz')).toBe(`160${NBSP}000${NBSP}soʻm`);
  });

  it('keeps the ISO code in en', () => {
    expect(formatUzs(160_000, 'en')).toBe(`160${NBSP}000${NBSP}UZS`);
  });

  it('falls back to ru for an unknown locale and when none is given', () => {
    expect(formatUzs(32_000, 'de')).toBe(`32${NBSP}000${NBSP}сум`);
    expect(formatUzs(32_000)).toBe(`32${NBSP}000${NBSP}сум`);
  });

  it('groups large sums and rounds', () => {
    expect(formatUzs(1_234_567.6, 'ru')).toBe(`1${NBSP}234${NBSP}568${NBSP}сум`);
  });
});
