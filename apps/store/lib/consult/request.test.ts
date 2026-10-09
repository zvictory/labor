import { describe, expect, it } from 'vitest';

import { consultAdminMessage, consultInputSchema, normalizeUzPhone } from './request';

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

describe('consultInputSchema', () => {
  const base = { phone: '90 123 45 67', source: 'product', locale: 'uz' };

  it('normalises the phone and drops empty optional fields', () => {
    const parsed = consultInputSchema.parse({ ...base, name: '  ', message: '' });
    expect(parsed).toEqual({ phone: '+998901234567', source: 'product', locale: 'uz' });
  });

  it('flags a bad phone on the phone field', () => {
    const res = consultInputSchema.safeParse({ ...base, phone: '123' });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]?.path).toEqual(['phone']);
  });

  it('falls back to ru for an unknown locale and rejects an unknown source', () => {
    expect(consultInputSchema.parse({ ...base, locale: 'de' }).locale).toBe('ru');
    expect(consultInputSchema.safeParse({ ...base, source: 'home' }).success).toBe(false);
  });

  it('caps the message length', () => {
    expect(consultInputSchema.safeParse({ ...base, message: 'x'.repeat(1001) }).success).toBe(false);
  });
});

describe('consultAdminMessage', () => {
  it('escapes what the visitor typed and links the product', () => {
    const text = consultAdminMessage(
      {
        phone: '+998901234567',
        name: '<b>Ali</b>',
        message: 'oud & rose',
        productSlug: 'oud-royal',
        source: 'product',
        locale: 'uz',
      },
      'https://laborparfum.com',
    );
    expect(text).toContain('Имя: &lt;b&gt;Ali&lt;/b&gt;');
    expect(text).toContain('Сообщение: oud &amp; rose');
    expect(text).toContain('https://laborparfum.com/ru/product/oud-royal');
    expect(text).toContain('страница аромата · uz');
  });
});
