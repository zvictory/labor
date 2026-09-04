import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export default async function BrandDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  redirect(taxonomyHref('brand', locale, slug));
}
