import { describe, expect, it } from 'vitest';

import { formatUzPhone, normalizeUzPhone } from './phone';

describe('normalizeUzPhone', () => {
  it.each([
    ['+998 90 123-45-67', '+998901234567'],
    ['998901234567', '+998901234567'],
    ['(90) 123 45 67', '+998901234567'],
    ['901234567', '+998901234567'],
  ])('reads %s', (raw, expected) => {
    expect(normalizeUzPhone(raw)).toBe(expected);
  });

  it.each(['', '12345', '+7 912 345 67 89', '+998 90 123 45 6', '+998 90 123 45 678'])(
    'rejects %s',
    (raw) => {
      expect(normalizeUzPhone(raw)).toBeNull();
    },
  );
});

describe('formatUzPhone', () => {
  // The checkout field starts as "+998 " and the customer types the rest, or
  // pastes a number from somewhere else; each has to end up looking the same.
  it.each(['+998 901234567', '998901234567', '90 123-45-67', '+998901234567'])(
    'groups %s',
    (raw) => {
      expect(formatUzPhone(raw)).toBe('+998 90 123 45 67');
    },
  );

  // Formatting runs when the field is left. A number still being typed must
  // survive that untouched, or the customer loses what they entered.
  it.each(['', '+998 ', '+998 90 12', '+7 912 345 67 89'])('leaves %j as typed', (raw) => {
    expect(formatUzPhone(raw)).toBe(raw);
  });
});
