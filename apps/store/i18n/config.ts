export const locales = ['ru', 'uz', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ru';

export const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  uz: 'Oʻzbekcha',
  en: 'English',
};

export const localeHtmlLang: Record<Locale, string> = {
  ru: 'ru',
  uz: 'uz-Latn',
  en: 'en',
};
