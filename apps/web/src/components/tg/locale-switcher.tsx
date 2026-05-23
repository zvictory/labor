'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Globe } from 'lucide-react';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { apiFetch, ApiError } from '@/lib/api/client';
import { getWebApp } from '@/lib/telegram-webapp';

const pathWithLocale = (pathname: string, next: Locale): string => {
  const segments = pathname.split('/');
  if (segments[1] && (locales as readonly string[]).includes(segments[1])) {
    segments[1] = next;
  } else {
    segments.splice(1, 0, next);
  }
  const joined = segments.join('/');
  return joined.length > 0 ? joined : `/${next}`;
};

const persistLocale = (next: Locale): void => {
  if (typeof window === 'undefined') return;
  const token = window.localStorage.getItem('labor-token') ?? undefined;
  if (!token) return;

  // best-effort: don't block navigation or surface errors to the user.
  void apiFetch<unknown>('/storefront/account/locale', {
    method: 'PATCH',
    body: { locale: next },
    token,
    locale: next,
  }).catch((err: unknown) => {
    if (err instanceof ApiError) {
      // eslint-disable-next-line no-console
      console.warn('[tg-locale] persist failed', err.status, err.message);
    }
  });
};

export const TgLocaleSwitcher = () => {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleChange = (next: Locale): void => {
    if (next === locale) return;
    getWebApp()?.HapticFeedback.selectionChanged();
    persistLocale(next);
    const nextPath = pathWithLocale(pathname, next);
    startTransition(() => {
      router.push(nextPath);
      router.refresh();
    });
  };

  return (
    <label className="inline-flex items-center gap-1.5 rounded-full border border-[var(--tg-hint-color)]/25 bg-[var(--tg-bg-color)]/60 px-2.5 py-1 text-xs font-medium text-[var(--tg-text-color)]">
      <Globe className="h-3.5 w-3.5 text-[var(--tg-hint-color)]" aria-hidden />
      <select
        aria-label="Interface language"
        value={locale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        className="cursor-pointer appearance-none bg-transparent pr-1 font-medium uppercase tracking-wider focus:outline-none"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
};
