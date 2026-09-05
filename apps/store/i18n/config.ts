// Russian is the shop's default: the customers are in Tashkent, and ru is what
// they read. The storefront ran on `['en']` alone from the Brandbook rebuild
// (142554f) until this — an unremarked side effect of that commit rather than a
// decision, which meant /ru and /uz redirected to /en and two complete message
// files, 295 keys each, reached nobody.
export const locales = ['ru', 'en', 'uz'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ru';

export const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  // U+02BB, the modifier letter the rest of the Uzbek messages use for oʻ/gʻ.
  // A plain ' is a different character and sorts and reads as an error.
  uz: 'Oʻzbekcha',
};

export const localeHtmlLang: Record<Locale, string> = {
  ru: 'ru',
  en: 'en',
  uz: 'uz',
};
