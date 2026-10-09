import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { CampaignSummaryDTO } from '@/lib/catalog/campaigns';

// Tashkent dates, whatever the server's clock zone.
export const formatCampaignDate = (date: Date, locale: string): string =>
  new Intl.DateTimeFormat(locale === 'uz' ? 'uz-Latn-UZ' : locale === 'en' ? 'en-GB' : 'ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Tashkent',
  }).format(date);

// One campaign as a card: picture, title, line, end date. Used on the home page
// and on /campaigns. The image is a URL staff typed in the admin, from any
// host, so it is a plain <img> rather than next/image (which only loads
// allow-listed hosts).
export function CampaignCard({
  campaign,
  locale,
}: {
  campaign: CampaignSummaryDTO;
  locale: string;
}) {
  const t = useTranslations('campaigns');
  const tc = useTranslations('campaign');
  const facts = [
    campaign.endsAt ? t('until', { date: formatCampaignDate(campaign.endsAt, locale) }) : null,
    campaign.productCount > 0 ? t('itemsCount', { count: campaign.productCount }) : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/${locale}/campaigns/${campaign.slug}`}
      className="group border-hairline hover:border-graphite dark:border-gunmetal dark:hover:border-offwhite flex flex-col border transition-colors"
    >
      {campaign.heroImage && (
        <div className="border-hairline dark:border-gunmetal aspect-[16/9] overflow-hidden border-b">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={campaign.heroImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-muted-foreground text-micro font-mono tracking-[0.16em] uppercase">
          {t('eyebrow')}
          {facts.length > 0 ? ` · ${facts.join(' · ')}` : ''}
        </p>
        <h3 className="font-display text-2xl leading-tight">{campaign.title}</h3>
        {campaign.subtitle && <p className="text-muted-foreground text-sm">{campaign.subtitle}</p>}
        <span className="text-label mt-auto pt-2 font-mono tracking-[0.12em] uppercase underline-offset-4 group-hover:underline">
          {campaign.ctaLabel || tc('open')} →
        </span>
      </div>
    </Link>
  );
}
