import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { CampaignCard } from '@/components/campaigns/campaign-card';
import { getLiveCampaigns } from '@/lib/catalog/campaigns';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'campaigns' });
  const tc = await getTranslations({ locale, namespace: 'campaign' });
  return pageMetadata({
    locale,
    path: '/campaigns',
    title: t('eyebrow'),
    description: tc('metaDescription'),
  });
}

export default async function CampaignsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, campaigns] = await Promise.all([
    getTranslations('campaigns'),
    getLiveCampaigns(locale),
  ]);

  return (
    <div className="container space-y-10 py-12 md:py-16">
      <header className="space-y-2">
        <p className="text-muted-foreground text-label font-mono tracking-[0.16em] uppercase">
          {t('eyebrow')}
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.02em] md:text-6xl">{t('title')}</h1>
      </header>

      {campaigns.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">{t('empty')}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.slug} campaign={c} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
