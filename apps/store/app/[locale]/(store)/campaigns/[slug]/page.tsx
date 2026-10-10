import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { formatCampaignDate } from '@/components/campaigns/campaign-card';
import { TaxonomyProductGrid } from '@/components/catalog/taxonomy-product-grid';
import { getLiveCampaign } from '@/lib/catalog/campaigns';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

const loadCampaign = cache((slug: string, locale: string) => getLiveCampaign(slug, locale));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const campaign = await loadCampaign(slug, locale);
  if (!campaign) return {};
  return pageMetadata({
    locale,
    path: `/campaigns/${campaign.slug}`,
    title: campaign.title,
    description: campaign.subtitle || campaign.body.slice(0, 200) || undefined,
    images: campaign.heroImage ? [campaign.heroImage] : undefined,
  });
}

// A campaign as staff built it in the admin. Only live campaigns have a page:
// one that is switched off or outside its dates is a 404, like a sold-out
// window display that has been taken down.
export default async function CampaignPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const campaign = await loadCampaign(slug, locale);
  if (!campaign) notFound();

  const [t, tc] = await Promise.all([getTranslations('campaigns'), getTranslations('campaign')]);

  return (
    <div className="container space-y-12 py-12 md:py-16">
      <header className="space-y-6">
        <Link
          href={`/${locale}/campaigns`}
          className="text-muted-foreground hover:text-foreground text-label font-mono tracking-[0.16em] uppercase"
        >
          ← {tc('back')}
        </Link>
        {campaign.heroImage && (
          <div className="border-border aspect-[21/9] overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={campaign.heroImage} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="space-y-3">
          <p className="text-muted-foreground text-label font-mono tracking-[0.16em] uppercase">
            {t('eyebrow')}
            {campaign.endsAt
              ? ` · ${tc('until', { date: formatCampaignDate(campaign.endsAt, locale) })}`
              : ''}
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.02em] md:text-6xl">
            {campaign.title}
          </h1>
          {campaign.subtitle && (
            <p className="text-muted-foreground max-w-prose text-lg">{campaign.subtitle}</p>
          )}
        </div>
        {campaign.body && (
          <p className="max-w-prose font-serif text-base leading-relaxed whitespace-pre-line">
            {campaign.body}
          </p>
        )}
      </header>

      {campaign.slides.length > 0 && (
        <section className="grid gap-6 md:grid-cols-2">
          {campaign.slides.map((slide, i) => {
            const inner = (
              <>
                {slide.imageUrl && (
                  <div className="aspect-[16/9] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                {(slide.title || slide.subtitle || slide.ctaLabel) && (
                  <div className="space-y-1 p-5">
                    {slide.title && <h2 className="font-display text-xl">{slide.title}</h2>}
                    {slide.subtitle && (
                      <p className="text-muted-foreground text-sm">{slide.subtitle}</p>
                    )}
                    {slide.linkUrl && slide.ctaLabel && (
                      <span className="text-label inline-block pt-1 font-mono tracking-[0.12em] uppercase underline underline-offset-4">
                        {slide.ctaLabel} →
                      </span>
                    )}
                  </div>
                )}
              </>
            );
            return slide.linkUrl ? (
              <a
                key={i}
                href={slide.linkUrl}
                className="border-border hover:border-foreground block border transition-colors"
              >
                {inner}
              </a>
            ) : (
              <div key={i} className="border-border border">
                {inner}
              </div>
            );
          })}
        </section>
      )}

      {campaign.products.length > 0 && (
        <section className="border-border space-y-6 border-t pt-8">
          <h2 className="text-label font-mono tracking-[0.16em] uppercase">{tc('products')}</h2>
          <TaxonomyProductGrid products={campaign.products} locale={locale} emptyLabel="" />
        </section>
      )}
    </div>
  );
}
