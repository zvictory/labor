import { describe, expect, it } from 'vitest';
import { accountNavigation } from './account-navigation';

describe('account entry points', () => {
  it.each(['ru', 'en', 'uz'] as const)(
    'keeps %s guests on the localized sign-in flow',
    (locale) => {
      expect(accountNavigation(locale, false).href).toBe(`/${locale}/account/login`);
      expect(accountNavigation(locale, true).href).toBe(`/${locale}/account`);
      expect(accountNavigation(locale, false).shortLabel).not.toBe(
        accountNavigation(locale, true).shortLabel,
      );
    },
  );
});
