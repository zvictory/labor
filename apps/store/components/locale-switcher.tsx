'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

import { locales, localeNames, type Locale } from '@/i18n/config';

// Client locale switcher — rewrites the leading locale segment of the current
// path. Ported from apps/web/src/components/locale-switcher.tsx.
//
// The header shows only the two-letter code in a 44 × 44 target; the native
// select sits invisibly over it, so the picker itself still lists full names.
export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    const segments = pathname.split('/');
    if (segments[1] && (locales as readonly string[]).includes(segments[1])) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    router.push(segments.join('/') || `/${next}`);
  };

  return (
    <label className="text-label relative flex h-11 w-11 items-center justify-center font-mono tracking-[0.1em] uppercase">
      <span aria-hidden="true">{locale}</span>
      <select
        aria-label={t('language')}
        value={locale}
        onChange={(e) => switchTo(e.target.value as Locale)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
