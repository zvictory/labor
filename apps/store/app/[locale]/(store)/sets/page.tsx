import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { CampaignCard } from '@/components/campaigns/campaign-card';
import { getLiveCampaigns } from '@/lib/catalog/campaigns';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'sets' });
  return pageMetadata({
    locale,
    path: '/sets',
    title: t('title'),
    description: t('metaDescription'),
  });
}

// Discovery sets: the live campaigns that carry a set price. Each card opens
// the campaign's own page, where the set is bought with one button.
export default async function SetsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, sets] = await Promise.all([
    getTranslations('sets'),
    getLiveCampaigns(locale, new Date(), { setsOnly: true }),
  ]);

  return (
    <div className="container space-y-10 py-12 md:py-16">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-[-0.02em] md:text-6xl">{t('title')}</h1>
        <p className="text-muted-foreground max-w-prose text-lg">{t('lead')}</p>
      </header>

      {sets.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">{t('empty')}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sets.map((set) => (
            <CampaignCard key={set.slug} campaign={set} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
