import type { Locale } from '@/i18n/config';

const labels = {
  ru: { guest: 'Вход / Регистрация', short: 'Войти', account: 'Мой кабинет' },
  en: { guest: 'Sign in / Register', short: 'Sign in', account: 'My account' },
  uz: { guest: 'Kirish / Roʻyxatdan oʻtish', short: 'Kirish', account: 'Kabinetim' },
} as const;

export function accountNavigation(locale: Locale, signedIn: boolean) {
  const copy = labels[locale] ?? labels.ru;
  return {
    href: `/${locale}/account${signedIn ? '' : '/login'}`,
    label: signedIn ? copy.account : copy.guest,
    shortLabel: signedIn ? copy.account : copy.short,
  };
}
