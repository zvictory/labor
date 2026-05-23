'use client';

import { useLocale } from 'next-intl';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { Globe } from 'lucide-react';

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    // pathname includes the current locale prefix; replace it
    const segments = pathname.split('/');
    if (segments[1] && (locales as readonly string[]).includes(segments[1])) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    router.push(segments.join('/') || `/${next}`);
  };

  return (
    <label className="relative inline-flex items-center gap-1 text-sm">
      <Globe className="h-4 w-4 text-ink-muted" aria-hidden />
      <select
        aria-label="Language"
        value={locale}
        onChange={(e) => switchTo(e.target.value as Locale)}
        className="cursor-pointer appearance-none bg-transparent pr-2 font-medium uppercase tracking-wider focus:outline-none"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
      <span className="sr-only">{params.locale as string}</span>
    </label>
  );
}
