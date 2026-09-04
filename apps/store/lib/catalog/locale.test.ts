import { describe, expect, it } from 'vitest';

import { resolveLocaleText } from './locale';

describe('resolveLocaleText', () => {
  it('uses the requested locale before falling back to ru', () => {
    expect(resolveLocaleText({ ru: 'Русский', en: 'English' }, 'en')).toBe('English');
    expect(resolveLocaleText({ ru: 'Русский', en: 'English' }, 'uz')).toBe('Русский');
  });

  it('uses Latin Uzbek as a fallback for Uzbek Cyrillic when uzc is absent', () => {
    expect(resolveLocaleText({ ru: 'Роза', uz: 'Atirgul' }, 'uzc')).toBe('Atirgul');
  });

  it('preserves an explicit Uzbek Cyrillic value', () => {
    expect(resolveLocaleText({ ru: 'Роза', uz: 'Atirgul', uzc: 'Атиргул' }, 'uzc')).toBe('Атиргул');
  });

  it('accepts legacy plain strings', () => {
    expect(resolveLocaleText('Legacy value', 'en')).toBe('Legacy value');
  });
});
