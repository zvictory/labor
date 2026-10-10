// Uzbek phone numbers: reading what people type, and showing it back. No
// server imports, so the storefront forms can use it in the browser.

/**
 * An Uzbek mobile or landline number in the canonical `+998XXXXXXXXX` form, or
 * null. Accepts what people actually type: spaces, dashes, brackets, with or
 * without the +, or the nine local digits alone.
 */
export const normalizeUzPhone = (raw: string): string | null => {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 9) digits = `998${digits}`;
  return /^998\d{9}$/.test(digits) ? `+${digits}` : null;
};

/**
 * A complete number as `+998 90 123 45 67`. Anything that is not yet a
 * complete number comes back as typed, so a field can run this when the
 * customer leaves it without eating a half-typed number.
 */
export const formatUzPhone = (raw: string): string => {
  const phone = normalizeUzPhone(raw);
  if (!phone) return raw;
  const local = phone.slice(4);
  return `+998 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
};
