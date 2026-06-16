// Resolve a per-locale JSON value ({ ru, uz, en }) to a single string for the
// requested locale, falling back to ru (mirrors Mobility fallbacks uz->ru,
// en->ru). Tolerates raw strings (legacy/untranslated rows) and nullish values.

export type Locale = 'ru' | 'uz' | 'en';

export const DEFAULT_LOCALE: Locale = 'ru';

const isLocaleRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const pick = (record: Record<string, unknown>, key: string): string | undefined => {
  const v = record[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
};

/**
 * Read translatable text from a per-locale JSON value with ru fallback.
 * @returns the localized string, or '' when nothing is available.
 */
export const resolveLocaleText = (value: unknown, locale: string): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (!isLocaleRecord(value)) {
    return '';
  }

  return pick(value, locale) ?? pick(value, DEFAULT_LOCALE) ?? '';
};
