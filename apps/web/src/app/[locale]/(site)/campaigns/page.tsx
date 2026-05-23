import Link from 'next/link';
import Image from 'next/image';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { apiFetch } from '@/lib/api/client';

interface CampaignSummary {
  slug: string;
  title: string;
  description: string;
  banner_url?: string;
  starts_at: string;
  ends_at: string;
  products_count: number;
}

interface Props { params: Promise<{ locale: string }> }

export default async function CampaignsIndex({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('campaigns');

  let data: CampaignSummary[] = [];
  try {
    const res = await apiFetch<{ data: CampaignSummary[] }>('/storefront/campaigns', {
      locale,
      next: { revalidate: 300 },
    });
    data = res.data;
  } catch {
    // backend offline — render empty state instead of crashing SSR
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{t('eyebrow')}</p>
        <h1 className="font-serif text-4xl">{t('title')}</h1>
      </header>

      {data.length === 0 ? (
        <p className="py-16 text-center text-stone-500">{t('empty')}</p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2">
          {data.map((c) => (
            <li key={c.slug}>
              <Link href={`/${locale}/campaigns/${c.slug}`} className="group block overflow-hidden rounded-xl border border-stone-200">
                {c.banner_url && (
                  <div className="relative aspect-[16/9] overflow-hidden bg-stone-50">
                    <Image src={c.banner_url} alt={c.title} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition-transform group-hover:scale-105" />
                  </div>
                )}
                <div className="space-y-2 p-5">
                  <h2 className="font-serif text-2xl">{c.title}</h2>
                  <p className="line-clamp-2 text-sm text-stone-700">{c.description}</p>
                  <div className="flex items-center justify-between text-xs uppercase tracking-widest text-stone-500">
                    <span>{t('itemsCount', { count: c.products_count })}</span>
                    <span>{t('until', { date: new Date(c.ends_at).toLocaleDateString(locale) })}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
