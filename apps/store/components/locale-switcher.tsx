'use client';

import { useLocale } from 'next-intl';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';

import { locales, localeNames, type Locale } from '@/i18n/config';

// Client locale switcher — rewrites the leading locale segment of the current
// path. Ported from apps/web/src/components/locale-switcher.tsx.
export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

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
    <label className="relative inline-flex items-center gap-1 text-xs md:text-sm">
      <Globe className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" aria-hidden />
      <select
        aria-label="Language"
        value={locale}
        onChange={(e) => switchTo(e.target.value as Locale)}
        className="cursor-pointer appearance-none bg-transparent pr-4 font-mono font-semibold uppercase tracking-wider focus:outline-none text-stone-700 dark:text-stone-300"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
            {l.toUpperCase()}
          </option>
        ))}
      </select>
      <span className="sr-only">{params.locale as string}</span>
    </label>
  );
}
