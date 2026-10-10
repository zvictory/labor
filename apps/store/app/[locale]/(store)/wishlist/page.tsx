import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { WishlistList } from '@/components/wishlist/wishlist-list';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'wishlist' });
  // Personal: nothing here for a search engine.
  return pageMetadata({ locale, path: '/wishlist', title: t('title'), noindex: true });
}

export default async function WishlistPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('wishlist');

  return (
    <div className="container space-y-10 py-12 md:py-16">
      <h1 className="font-display text-ink dark:text-bone text-4xl md:text-5xl">{t('title')}</h1>
      <WishlistList locale={locale} />
    </div>
  );
}
