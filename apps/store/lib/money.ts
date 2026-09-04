// Money helpers for Labor Parfum. Currency is UZS only, stored as integer minor
// units (so'm). Ported verbatim from apps/web/src/lib/format.ts.
//
// Group separator is hand-rolled per locale instead of Intl.NumberFormat because
// Node's bundled ICU and the browser's full ICU disagree on uz-Latn / uz-Cyrl
// (Node falls back to `,`, browser uses NBSP) — that mismatch hydration-breaks
// any price rendered in a client component. Keep this deterministic.

const NBSP = '\u00A0';
const GROUP_SEP: Record<string, string> = {
  ru: NBSP,
  en: NBSP,
  uz: NBSP,
};

export const formatUzs = (amount: number, locale: string = 'ru'): string => {
  const sep = GROUP_SEP[locale] ?? GROUP_SEP.ru!;
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return `${grouped}${NBSP}UZS`;
};

// Labor sells by volume. The bench rate is the same one quoted at the counter,
// so the site and the shop cannot drift apart on price.
export const PRICE_PER_ML = 16_000;
export const SAMPLE_ML = 2;

export const formatRating = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);
