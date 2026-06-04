import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageIntro } from '@/components/page-intro';
import { getPerfumer } from '@/lib/api/perfumers';
import { ProductCard } from '@/components/catalog/product-card';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function PerfumerDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('perfumers');

  try {
    const { data: perfumer } = await getPerfumer(slug, locale);

    return (
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-4 md:py-6">
        <PageIntro
          eyebrow={perfumer.country}
          title={perfumer.name}
          lead={perfumer.bio ? <span className="whitespace-pre-line">{perfumer.bio}</span> : null}
          className="max-w-3xl"
        />

        {/* Fragrances */}
        <section className="space-y-8">
          <div className="border-border/60 flex items-baseline justify-between border-b pb-4">
            <h2 className="text-ink dark:text-bone font-serif text-2xl tracking-tight md:text-3xl">
              {t('detailFragrances')}
            </h2>
            <span className="text-ink-muted font-mono text-[10px] tracking-[0.3em] uppercase dark:text-stone-500">
              {t('productCount', { count: perfumer.products.length })}
            </span>
          </div>

          {perfumer.products.length === 0 ? (
            <p className="text-ink-muted text-center text-sm dark:text-stone-400">{t('empty')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {perfumer.products.map((p) => (
                <ProductCard key={p.id} product={p} locale={locale} />
              ))}
            </div>
          )}
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
