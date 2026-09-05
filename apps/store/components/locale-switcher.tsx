'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';

import { locales, localeNames, type Locale } from '@/i18n/config';

// Client locale switcher — rewrites the leading locale segment of the current
// path. Ported from apps/web/src/components/locale-switcher.tsx.
export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
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
    <label className="relative inline-flex items-center gap-1 text-sm">
      <Globe className="text-muted-foreground h-4 w-4" aria-hidden />
      <select
        aria-label="Language"
        value={locale}
        onChange={(e) => switchTo(e.target.value as Locale)}
        className="text-label cursor-pointer appearance-none bg-transparent pr-2 font-mono tracking-[0.16em] uppercase"
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
