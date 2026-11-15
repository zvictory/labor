import { describe, expect, it } from 'vitest';

import { decodeLocaleRecord, resolveLocaleText } from './locale';

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

  it('reads a record the admin saved as JSON text', () => {
    expect(resolveLocaleText('{"ru":"Зима","uz":"Qish"}', 'uz')).toBe('Qish');
    expect(resolveLocaleText('{"ru":"Зима"}', 'en')).toBe('Зима');
  });

  it('reads a record that a second save wrapped inside ru', () => {
    const twice = JSON.stringify({ ru: JSON.stringify({ ru: 'Зима', uz: 'Qish' }) });
    expect(resolveLocaleText(twice, 'uz')).toBe('Qish');
    expect(resolveLocaleText({ ru: '{"ru":"Зима"}' }, 'ru')).toBe('Зима');
  });

  it('leaves text that only looks like JSON alone', () => {
    expect(resolveLocaleText('{not json}', 'ru')).toBe('{not json}');
    expect(resolveLocaleText({ ru: '{скобки}' }, 'ru')).toBe('{скобки}');
  });
});

describe('decodeLocaleRecord', () => {
  it('gives the record whether it is stored as one, as text, or wrapped again', () => {
    const record = { ru: 'Зима', en: 'Winter' };
    expect(decodeLocaleRecord(record)).toEqual(record);
    expect(decodeLocaleRecord(JSON.stringify(record))).toEqual(record);
    expect(decodeLocaleRecord(JSON.stringify({ ru: JSON.stringify(record) }))).toEqual(record);
  });

  it('is null for plain text, arrays and nothing', () => {
    expect(decodeLocaleRecord('Зима')).toBeNull();
    expect(decodeLocaleRecord('[1,2]')).toBeNull();
    expect(decodeLocaleRecord(null)).toBeNull();
  });
});
