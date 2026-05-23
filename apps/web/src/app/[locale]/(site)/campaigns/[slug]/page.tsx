import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { apiFetch, ApiError } from '@/lib/api/client';
import { formatUzs } from '@/lib/format';

interface Campaign {
  slug: string;
  title: string;
  description: string;
  banner_url?: string;
  promo_code?: string;
  starts_at: string;
  ends_at: string;
  products: Array<{ id: number; slug: string; name: string; brand: string; image: string; price: number; sale_price?: number }>;
}

interface Props { params: Promise<{ locale: string; slug: string }> }

export default async function CampaignPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('campaign');

  let campaign: Campaign;
  try {
    campaign = (await apiFetch<{ data: Campaign }>(`/storefront/campaigns/${slug}`, { locale, next: { revalidate: 300 } })).data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 space-y-8">
      <header className="space-y-3 text-center">
        {campaign.banner_url && (
          <div className="relative mx-auto h-64 w-full max-w-3xl overflow-hidden rounded-xl">
            <Image src={campaign.banner_url} alt={campaign.title} fill priority sizes="(min-width:768px) 768px, 100vw" className="object-cover" />
          </div>
        )}
        <h1 className="font-serif text-4xl tracking-tight">{campaign.title}</h1>
        <p className="mx-auto max-w-2xl text-stone-700">{campaign.description}</p>
        {campaign.promo_code && (
          <p className="text-sm">
            {t('useCode')}:{' '}
            <code className="rounded-md bg-amber-100 px-2 py-1 font-mono">{campaign.promo_code}</code>
          </p>
        )}
        <p className="text-xs uppercase tracking-widest text-stone-500">
          {t('until', { date: new Date(campaign.ends_at).toLocaleDateString(locale) })}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {campaign.products.map((p) => (
          <Link key={p.id} href={`/${locale}/product/${p.slug}`} className="group block space-y-2">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-50">
              <Image src={p.image} alt={p.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform group-hover:scale-105" />
            </div>
            <p className="text-xs uppercase tracking-widest text-stone-500">{p.brand}</p>
            <p className="text-sm">{p.name}</p>
            <p className="text-sm">
              {p.sale_price ? (
                <>
                  <span className="font-medium text-rose-700">{formatUzs(p.sale_price, locale)}</span>{' '}
                  <span className="text-stone-400 line-through">{formatUzs(p.price, locale)}</span>
                </>
              ) : (
                <span className="font-medium">{formatUzs(p.price, locale)}</span>
              )}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
