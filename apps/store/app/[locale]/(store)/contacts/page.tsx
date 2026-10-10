import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { locales, type Locale } from '@/i18n/config';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { SITE_NAME, absoluteUrl, jsonLdScript, pageMetadata } from '@/lib/seo';
import { STORE_CONTACT, instagramUrl, telHref } from '@/lib/store-contact';
import { TELEGRAM_HANDLE, TELEGRAM_URL } from '@/lib/telegram';
import { ConsultForm } from '@/components/consult/consult-form';

type Props = { params: Promise<{ locale: Locale }> };

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contacts' });
  return pageMetadata({ locale, path: '/contacts', title: t('title'), description: t('subtitle') });
}

const linkCls = 'text-foreground font-medium underline-offset-4 hover:underline';

// Only the rows the shop has filled in (lib/store-contact.ts). Telegram is
// always there: it is how most orders arrive.
export default async function ContactsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('contacts');
  const c = STORE_CONTACT;

  const address = c.address ? resolveLocaleText(c.address, locale) : null;
  const hours = c.hours ? resolveLocaleText(c.hours, locale) : null;

  const rows: { label: string; value: ReactNode }[] = [
    ...(c.phone
      ? [{ label: t('phone'), value: <a href={telHref(c.phone)} className={linkCls}>{c.phone}</a> }]
      : []),
    {
      label: t('telegram'),
      value: (
        <>
          <a href={TELEGRAM_URL} className={linkCls}>
            {TELEGRAM_HANDLE}
          </a>
          <span className="text-muted-foreground block text-sm">{t('telegramNote')}</span>
        </>
      ),
    },
    ...(address
      ? [
          {
            label: t('address'),
            value: (
              <>
                {address}
                {c.mapUrl && (
                  <a
                    href={c.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${linkCls} block text-sm`}
                  >
                    {t('map')}
                  </a>
                )}
              </>
            ),
          },
        ]
      : []),
    ...(hours ? [{ label: t('hours'), value: hours }] : []),
    ...(c.email
      ? [{ label: t('email'), value: <a href={`mailto:${c.email}`} className={linkCls}>{c.email}</a> }]
      : []),
    ...(c.instagram
      ? [
          {
            label: t('instagram'),
            value: (
              <a href={instagramUrl(c.instagram)} target="_blank" rel="noreferrer" className={linkCls}>
                @{c.instagram.replace(/^@/, '')}
              </a>
            ),
          },
        ]
      : []),
  ];

  // A local-business record lets a search engine show the shop with its
  // address and phone. It only makes sense once there is an address.
  const storeLd = address
    ? {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: SITE_NAME,
        url: absoluteUrl(`/${locale}`),
        address,
        ...(c.phone ? { telephone: c.phone } : {}),
        ...(c.email ? { email: c.email } : {}),
        sameAs: [TELEGRAM_URL, ...(c.instagram ? [instagramUrl(c.instagram)] : [])],
      }
    : null;

  return (
    <div className="container max-w-3xl space-y-12 py-12">
      {storeLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(storeLd) }}
        />
      )}
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-[-0.02em] md:text-6xl">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </header>

      <dl className="divide-border border-border divide-y border-y">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-1 gap-1 py-5 md:grid-cols-[200px_1fr]">
            <dt className="text-label text-muted-foreground font-mono tracking-[0.16em] uppercase">
              {row.label}
            </dt>
            <dd className="text-base">{row.value}</dd>
          </div>
        ))}
      </dl>

      <section className="border-border border-t pt-8">
        <ConsultForm locale={locale} source="contacts" />
      </section>

      <p className="text-sm">
        <Link href={`/${locale}/delivery`} className={linkCls}>
          {t('deliveryLink')} →
        </Link>
      </p>
    </div>
  );
}
