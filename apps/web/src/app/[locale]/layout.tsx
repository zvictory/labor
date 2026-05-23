import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { locales, localeHtmlLang, type Locale } from '@/i18n/config';
import { AppQueryProvider } from '@/providers/query-client-provider';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!(locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppQueryProvider>
        <div lang={localeHtmlLang[locale as Locale]} className="contents">
          {children}
        </div>
      </AppQueryProvider>
    </NextIntlClientProvider>
  );
}
