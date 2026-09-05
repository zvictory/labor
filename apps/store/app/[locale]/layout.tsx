import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { SessionProvider } from 'next-auth/react';

import { locales } from '@/i18n/config';
import { TelegramWebAppBridge } from '@/components/telegram/webapp-bridge';

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
      <SessionProvider>
        <TelegramWebAppBridge />
        {/* `lang` lives on <html> in app/layout.tsx now. A <div> here could not
            reach <head>, so the page title was announced in the wrong voice. */}
        {children}
      </SessionProvider>
    </NextIntlClientProvider>
  );
}
