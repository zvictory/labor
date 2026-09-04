import { describe, expect, it } from 'vitest';

import { taxonomyHref } from './taxonomy-href';

describe('taxonomyHref', () => {
  it.each([
    ['brand', 'ru', 'dior', '/ru/catalog?brand=dior'],
    ['note', 'en', 'rose', '/en/catalog?note=rose'],
    ['perfumer', 'uz', 'alberto-morillas', '/uz/catalog?perfumer=alberto-morillas'],
  ] as const)('builds a catalog filter href for a %s', (kind, locale, slug, expected) => {
    expect(taxonomyHref(kind, locale, slug)).toBe(expected);
  });
});
