import { describe, expect, it } from 'vitest';

import { instagramUrl, telHref } from './store-contact';

describe('telHref', () => {
  it('keeps only digits and the leading plus', () => {
    expect(telHref('+998 (71) 200-00-00')).toBe('tel:+998712000000');
  });
});

describe('instagramUrl', () => {
  it('accepts a handle with or without @', () => {
    expect(instagramUrl('@laborparfum')).toBe('https://instagram.com/laborparfum');
    expect(instagramUrl('laborparfum')).toBe('https://instagram.com/laborparfum');
  });
});
