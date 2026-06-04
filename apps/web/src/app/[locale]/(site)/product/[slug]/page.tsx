import { notFound } from 'next/navigation';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { getProduct } from '@/lib/api/products';
import { ApiError } from '@/lib/api/client';
import { NotesPyramid } from '@/components/pdp/notes-pyramid';
import { AccordsBars } from '@/components/pdp/accords-bars';
import { AggregateBars } from '@/components/pdp/aggregate-bars';
import { VoteWidget } from '@/components/pdp/vote-widget';
import { SimilarCarousel } from '@/components/pdp/similar-carousel';
import { CompareWishButtons } from '@/components/pdp/compare-wish-buttons';
import { AddToCart } from '@/components/pdp/add-to-cart';
import { ProductGallery } from '@/components/pdp/product-gallery';
import { formatRating, formatUzs } from '@/lib/format';

interface Props { params: Promise<{ locale: string; slug: string }> }

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pdp');

  let product;
  try {
    const res = await getProduct(slug, locale);
    product = res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const displayImages = product.images.length > 0
    ? product.images
    : [{ url: `/products/${product.slug}.png`, alt: product.name }];
  
  const hero = displayImages[0];
  const card = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand.name,
    price: product.price,
    image: hero?.url ?? '',
    avg_rating: product.fragrance.avg_rating,
    votes_count: product.fragrance.votes_count,
  };

  return (
    <article className="mx-auto max-w-6xl space-y-12 px-4 py-12 md:py-16">
      <nav className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400">
        <Link href={`/${locale}`} className="hover:text-brass transition-colors">Labor</Link>
        <span className="px-2 text-stone-300 dark:text-stone-700">/</span>
        <Link href={`/${locale}/catalog?brand=${product.brand.slug}`} className="hover:text-brass transition-colors">{product.brand.name}</Link>
        <span className="px-2 text-stone-300 dark:text-stone-700">/</span>
        <span className="text-stone-700 dark:text-stone-300">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <ProductGallery images={displayImages} productName={product.name} />

        <div className="space-y-6">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-brass font-bold">{product.brand.name}</p>
          <h1 className="font-sans font-bold text-4xl md:text-5xl tracking-tight text-ink dark:text-bone">{product.name}</h1>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {product.gender} · {product.concentration.toUpperCase()} · {product.volume_ml} ml
            {product.perfumers.length > 0 && <> · {product.perfumers.map((p) => p.name).join(', ')}</>}
          </p>

          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="text-amber-500">★</span>
              <span className="font-medium text-ink dark:text-bone">{formatRating(product.fragrance.avg_rating)}</span>
              <span className="text-stone-500 dark:text-stone-400">({product.fragrance.votes_count})</span>
            </span>
            <span className="text-stone-300 dark:text-stone-700">·</span>
            <span className="text-stone-600 dark:text-stone-400">{t('longevityShort')} {formatRating(product.fragrance.avg_longevity)}/5</span>
            <span className="text-stone-300 dark:text-stone-700">·</span>
            <span className="text-stone-600 dark:text-stone-400">{t('sillageShort')} {formatRating(product.fragrance.avg_sillage)}/5</span>
          </div>

          {product.description && <p className="text-ink-muted dark:text-stone-300 leading-relaxed font-sans text-sm md:text-base">{product.description}</p>}

          <p className="font-sans font-semibold text-3xl text-brass">{formatUzs(product.price, locale)}</p>

          <AddToCart product={product} locale={locale} />
          <CompareWishButtons card={card} />
        </div>
      </div>

      <div className="grid gap-10 md:grid-cols-2 md:items-start">
        <AccordsBars accords={product.fragrance.accords} />
        <NotesPyramid notes={product.fragrance.notes} locale={locale} />
      </div>
      <AggregateBars
        seasons={product.fragrance.seasons}
        time={product.fragrance.time}
        love={product.fragrance.love}
        votesCount={product.fragrance.votes_count}
      />
      <VoteWidget productId={product.id} locale={locale} />
      <SimilarCarousel items={product.similar} locale={locale} />
    </article>
  );
}
