import type { ReactNode } from 'react';
import { getLocale } from 'next-intl/server';

import { localeHtmlLang, defaultLocale, type Locale } from '@/i18n/config';
import { archivo, jetbrainsMono, newsreader, storyScript } from '@/lib/fonts';
import './globals.css';

export const metadata = {
  title: { default: 'Labor — Parfumerie', template: '%s · Labor' },
  description: 'Multi-brand niche & selective fragrance in Uzbekistan',
  icons: { icon: '/favicon.ico' },
};

// `lang` has to be set here, on the element that actually carries it. The
// nested locale layout wrapped its children in <div lang> instead, which leaves
// <head> outside: a screen reader then read the page <title> in the listener's
// own default voice. WCAG 3.1.1 is Level A, and it matters more now that the
// storefront serves three languages again.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale;

  return (
    <html
      lang={localeHtmlLang[locale] ?? localeHtmlLang[defaultLocale]}
      suppressHydrationWarning
      className={`${archivo.variable} ${jetbrainsMono.variable} ${newsreader.variable} ${storyScript.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
