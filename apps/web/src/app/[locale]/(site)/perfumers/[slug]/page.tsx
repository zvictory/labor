import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
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
      <main className="mx-auto max-w-6xl px-6 py-16 space-y-16">
        {/* Editorial Header */}
        <header className="space-y-4 text-center max-w-3xl mx-auto py-8">
          {perfumer.country && (
            <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-brass font-bold block">
              {perfumer.country}
            </span>
          )}
          <h1 className="font-sans font-bold text-4xl md:text-5xl tracking-tight text-ink dark:text-bone">
            {perfumer.name}
          </h1>
          <div className="h-[1px] w-12 bg-brass mx-auto my-6 opacity-60" />
          {perfumer.bio && (
            <p className="text-sm md:text-base font-sans leading-relaxed text-ink-muted dark:text-stone-400 whitespace-pre-line">
              {perfumer.bio}
            </p>
          )}
        </header>

        {/* Fragrances */}
        <section className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-border/60 pb-4">
            <h2 className="font-serif text-2xl md:text-3xl tracking-tight text-ink dark:text-bone">
              {t('detailFragrances')}
            </h2>
            <span className="text-[10px] uppercase tracking-[0.3em] text-ink-muted dark:text-stone-500 font-mono">
              {t('productCount', { count: perfumer.products.length })}
            </span>
          </div>

          {perfumer.products.length === 0 ? (
            <p className="text-center text-sm text-ink-muted dark:text-stone-400">
              {t('empty')}
            </p>
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
