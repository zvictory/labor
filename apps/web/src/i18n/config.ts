export const locales = ['ru', 'en', 'uz'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ru';

export const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  uz: 'Oʻzbekcha',
};

export const localeHtmlLang: Record<Locale, string> = {
  ru: 'ru',
  en: 'en',
  uz: 'uz-Latn',
};
