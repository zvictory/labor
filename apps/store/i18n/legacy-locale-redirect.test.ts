import { describe, expect, it } from 'vitest';

import { getLegacyLocaleRedirect } from './legacy-locale-redirect';

describe('getLegacyLocaleRedirect', () => {
  it('redirects legacy locale prefixes while preserving path and query', () => {
    expect(getLegacyLocaleRedirect('/ru/catalog', '?page=2&sort=price')).toBe(
      '/en/catalog?page=2&sort=price',
    );
    expect(getLegacyLocaleRedirect('/uzc', '')).toBe('/en');
  });

  it('redirects dotted paths under legacy locale prefixes', () => {
    expect(getLegacyLocaleRedirect('/ru/perfume.eau', '')).toBe('/en/perfume.eau');
  });

  it('returns null for a non-legacy path', () => {
    expect(getLegacyLocaleRedirect('/en/catalog', '?page=2')).toBeNull();
    expect(getLegacyLocaleRedirect('/russian/catalog', '')).toBeNull();
  });
});
