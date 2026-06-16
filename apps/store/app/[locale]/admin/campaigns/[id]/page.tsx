// Admin campaign edit page. Server component: guarded by requireStaff(), loads the
// full editable campaign (getAdminCampaign), and mounts the three editor islands —
// core fields (CampaignForm), slides (SlideEditor), and featured products
// (FeaturedProducts). The product picker receives searchCampaignProducts as a
// server-action prop so the client never imports server-only query code. Includes
// active toggle + delete via small inline server-action forms. ru-primary labels.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { requireStaff } from '@/lib/admin/guard';
import { getAdminCampaign } from '@/lib/admin/campaign-queries';
import {
  toggleCampaignActive,
  deleteCampaign,
  searchCampaignProducts,
} from '@/lib/admin/campaign-actions';
import { CampaignForm } from '@/components/admin/campaigns/campaign-form';
import { SlideEditor } from '@/components/admin/campaigns/slide-editor';
import { FeaturedProducts } from '@/components/admin/campaigns/featured-products';

type Props = { params: Promise<{ locale: string; id: string }> };

const toDateInput = (date: Date | null): string | null =>
  date ? date.toISOString().slice(0, 10) : null;

export default async function AdminCampaignEditPage({ params }: Props) {
  await requireStaff();
  const { locale, id: idParam } = await params;

  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const campaign = await getAdminCampaign(id);
  if (!campaign) notFound();

  const base = `/${locale}/admin/campaigns`;
  const sectionTitleCls = 'text-[10px] font-bold uppercase tracking-[0.3em] text-brass';

  // Inline server actions for the top-bar controls.
  async function toggleActive() {
    'use server';
    await toggleCampaignActive(id);
  }
  async function remove() {
    'use server';
    const result = await deleteCampaign(id);
    if (result.ok) redirect(`/${locale}/admin/campaigns`);
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={base}
            className="text-xs text-ink-muted underline-offset-4 hover:text-brass hover:underline dark:text-stone-400"
          >
            ← Все кампании
          </Link>
          <h1 className="font-display text-3xl text-ink dark:text-bone">
            {campaign.title.ru || campaign.slug}
          </h1>
          <p className="text-sm text-ink-muted dark:text-stone-400">/{campaign.slug}</p>
        </div>
        <div className="flex gap-2">
          <form action={toggleActive}>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center border border-border px-4 text-xs font-semibold uppercase tracking-widest text-ink hover:border-brass dark:text-bone"
            >
              {campaign.active ? 'Скрыть' : 'Активировать'}
            </button>
          </form>
          <form action={remove}>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center border border-rose-300 px-4 text-xs font-semibold uppercase tracking-widest text-rose-700 hover:bg-rose-50"
            >
              Удалить
            </button>
          </form>
        </div>
      </header>

      {/* Core fields */}
      <section className="space-y-4">
        <h2 className={sectionTitleCls}>Параметры</h2>
        <div className="rounded-xl border border-border bg-background p-6">
          <CampaignForm
            locale={locale}
            initial={{
              id: campaign.id,
              slug: campaign.slug,
              title: campaign.title,
              subtitle: campaign.subtitle,
              body: campaign.body,
              ctaLabel: campaign.ctaLabel,
              heroImage: campaign.heroImage,
              active: campaign.active,
              startsAt: toDateInput(campaign.startsAt),
              endsAt: toDateInput(campaign.endsAt),
            }}
          />
        </div>
      </section>

      {/* Slides */}
      <section className="space-y-4">
        <h2 className={sectionTitleCls}>Слайды</h2>
        <SlideEditor campaignId={campaign.id} slides={campaign.slides} />
      </section>

      {/* Featured products */}
      <section className="space-y-4">
        <h2 className={sectionTitleCls}>Товары кампании</h2>
        <div className="rounded-xl border border-border bg-background p-6">
          <FeaturedProducts
            campaignId={campaign.id}
            locale={locale}
            initialSelected={campaign.products.map((p) => ({
              id: p.productId,
              slug: p.slug,
              name: p.name,
              price: p.price,
              image: p.image,
            }))}
            searchAction={searchCampaignProducts}
          />
        </div>
      </section>
    </div>
  );
}
