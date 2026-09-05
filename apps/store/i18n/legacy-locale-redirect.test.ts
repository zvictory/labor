import { describe, expect, it } from 'vitest';

import { getLegacyLocaleRedirect } from './legacy-locale-redirect';

describe('getLegacyLocaleRedirect', () => {
  it('sends the retired Cyrillic Uzbek locale to Latin Uzbek, keeping path and query', () => {
    expect(getLegacyLocaleRedirect('/uzc/catalog', '?page=2&sort=price')).toBe(
      '/uz/catalog?page=2&sort=price',
    );
    expect(getLegacyLocaleRedirect('/uzc', '')).toBe('/uz');
  });

  it('redirects dotted paths under the legacy prefix', () => {
    expect(getLegacyLocaleRedirect('/uzc/perfume.eau', '')).toBe('/uz/perfume.eau');
  });

  // ru and uz were redirected to /en while the storefront ran on one locale.
  // Redirecting a locale that exists would make it unreachable, so the most
  // important thing this function can do now is leave them alone.
  it('leaves live locales alone', () => {
    expect(getLegacyLocaleRedirect('/ru/catalog', '?page=2')).toBeNull();
    expect(getLegacyLocaleRedirect('/uz/catalog', '')).toBeNull();
    expect(getLegacyLocaleRedirect('/en/catalog', '?page=2')).toBeNull();
  });

  it('returns null for a non-legacy path', () => {
    expect(getLegacyLocaleRedirect('/russian/catalog', '')).toBeNull();
    expect(getLegacyLocaleRedirect('/uzcatalog', '')).toBeNull();
  });
});
