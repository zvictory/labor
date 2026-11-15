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
 * The { ru, uz, en } record in a stored value, or null when there is none.
 *
 * The admin saves these records as JSON text, so a column holds either the
 * record or a string of it. A record saved again from a form that had read it
 * as plain text ends up one level deeper, inside `ru`; that is unwrapped too,
 * so such a row reads correctly and is repaired the next time it is saved.
 */
export const decodeLocaleRecord = (value: unknown, depth = 0): Record<string, unknown> | null => {
  if (depth > 3) return null;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text.startsWith('{') || !text.endsWith('}')) return null;
    try {
      return decodeLocaleRecord(JSON.parse(text), depth + 1);
    } catch {
      return null;
    }
  }
  if (!isLocaleRecord(value)) return null;
  return (typeof value.ru === 'string' ? decodeLocaleRecord(value.ru, depth + 1) : null) ?? value;
};

/**
 * Read translatable text from a per-locale JSON value with ru fallback.
 * @returns the localized string, or '' when nothing is available.
 */
export const resolveLocaleText = (value: unknown, locale: string): string => {
  const record = decodeLocaleRecord(value);
  if (!record) return typeof value === 'string' ? value : '';

  return (
    pick(record, locale) ??
    (locale === 'uzc' ? pick(record, 'uz') : undefined) ??
    pick(record, DEFAULT_LOCALE) ??
    ''
  );
};
