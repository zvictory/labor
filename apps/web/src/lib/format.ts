// Group separator per locale. Hand-rolled instead of Intl.NumberFormat because
// Node's bundled ICU and the browser's full ICU disagree on uz-Latn / uz-Cyrl
// (Node falls back to `,`, browser uses NBSP) — that mismatch hydration-breaks
// any price rendered in a client component. Keep this deterministic.
const GROUP_SEP: Record<string, string> = {
  ru: ' ',
  en: ',',
  uz: ' ',
};

export const formatUzs = (amount: number, locale: string = 'ru'): string => {
  const sep = GROUP_SEP[locale] ?? GROUP_SEP.ru!;
  const grouped = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return `${grouped} UZS`;
};

export const formatRating = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);
