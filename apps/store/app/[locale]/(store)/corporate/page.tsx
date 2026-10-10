import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { ConsultForm } from '@/components/consult/consult-form';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'corporate' });
  return pageMetadata({ locale, path: '/corporate', title: t('title'), description: t('lead') });
}

// Gifts for a company, a wedding or a holiday: the shop's version of the
// wholesale page Uzbek shops carry. Requests land in /admin/requests with the
// source "corporate".
export default async function CorporatePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('corporate');

  return (
    <div className="container max-w-3xl space-y-10 py-12 md:py-16">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-[-0.02em] md:text-6xl">{t('title')}</h1>
        <p className="text-muted-foreground max-w-prose text-base">{t('lead')}</p>
      </header>
      <section className="border-border border-t pt-8">
        <ConsultForm locale={locale} source="corporate" showHeading={false} />
      </section>
    </div>
  );
}
