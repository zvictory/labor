import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
import { PdpBuyBlock } from '@/components/pdp/pdp-buy-block';
import { ProductGallery } from '@/components/pdp/product-gallery';
import { formatRating, formatUzs } from '@/lib/format';

const BRAND_LOGOS: Record<string, string> = {
  'abercrombie-fitch': 'svg',
  'acqua-di-parma': 'svg',
  'ajmal': 'svg',
  'amouage': 'svg',
  'arabian-oud': 'webp',
  'armani': 'svg',
  'giorgio-armani': 'svg',
  'boadicea-the-victorious': 'webp',
  'bvlgari': 'svg',
  'byredo': 'svg',
  'carolina-herrera': 'webp',
  'casa-tito': 'webp',
  'chanel': 'svg',
  'clive-christian': 'svg',
  'creation': 'webp',
  'dior': 'svg',
  'dolce-gabbana': 'svg',
  'ensar-oud': 'webp',
  'ermenegildo-zegna': 'svg',
  'escentric-molecules': 'svg',
  'escentric': 'svg',
  'essential-parfums': 'svg',
  'ex-nihilo': 'webp',
  'genyum': 'svg',
  'gucci': 'svg',
  'guerlain': 'svg',
  'herm-s': 'svg',
  'hormone-paris': 'webp',
  'hugo-boss': 'svg',
  'initio': 'webp',
  'jean-paul-gaultier': 'webp',
  'jo-malone-london': 'webp',
  'juliette-has-a-gun': 'svg',
  'kajal': 'webp',
  'khaltat': 'webp',
  'kilian': 'webp',
  'lacoste': 'svg',
  'lancome': 'svg',
  'le-labo': 'webp',
  'louis-vuitton': 'svg',
  'maison-crivelli': 'svg',
  'marc-antoine-barrois': 'webp',
  'matiere-premiere': 'webp',
  'memo-paris': 'webp',
  'mix': 'svg',
  'montale': 'svg',
  'moschino': 'svg',
  'narciso-rodriguez': 'webp',
  'nasomatto': 'webp',
  'okiii': 'webp',
  'parfums-de-marly': 'webp',
  'penhaligon-s': 'webp',
  'prada': 'svg',
  'roja': 'webp',
  'stefano-ricci': 'webp',
  'tauer-perfumes': 'webp',
  'thameen': 'svg',
  'tom-ford': 'svg',
  'trussardi': 'svg',
  'valentino': 'svg',
  'versace': 'svg',
  'victoria-s-secret': 'svg',
  'vilhelm-parfumerie': 'webp',
  'xerjoff': 'webp',
  'yves-saint-laurent': 'svg',
  'zarkoperfume': 'svg',
};

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
      {/* Centered Scent Title Block (Fragrantica Style) */}
      <header className="text-center space-y-1 pb-6 border-b border-stone-200/50 dark:border-stone-850">
        <h1 className="font-display text-4xl tracking-tight text-ink dark:text-bone md:text-5xl lg:text-6xl leading-tight">
          {product.name} {product.brand.name}
        </h1>
        <p className="text-sm font-semibold lowercase tracking-widest text-[#229ED9]">
          {product.gender}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <ProductGallery images={displayImages} productName={product.name} />

        <div className="space-y-6">
          {/* Brand Info (Fragrantica-style top right aligned, next to gallery button) */}
          <div className="flex items-start justify-end gap-4 border-b border-stone-100 pb-4 dark:border-stone-900 w-full">
            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">brand</p>
                  <Link
                    href={`/${locale}/catalog?brand=${product.brand.slug}`}
                    className="text-sm font-semibold text-ink dark:text-bone hover:underline"
                  >
                    {product.brand.name}
                  </Link>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                </div>
              </div>
              
              {product.brand.slug && BRAND_LOGOS[product.brand.slug] && (
                <div className="relative h-10 w-28 transition-all duration-300 hover:opacity-85">
                  <Image
                    src={`/brands/${product.brand.slug}.${BRAND_LOGOS[product.brand.slug]}`}
                    alt={product.brand.name}
                    fill
                    className="object-contain object-right dark:brightness-0 dark:invert"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Accords Bars (Main Accords) */}
          <AccordsBars accords={product.fragrance.accords} locale={locale} />

          {/* Divider */}
          <div className="border-t border-stone-100 dark:border-stone-900 pt-4" />

          {/* Price & Rating block */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-2xl font-medium text-brass">
              {formatUzs(product.price)}
              {product.volume_ml && (
                <span className="ml-2 text-sm text-stone-400 font-sans font-normal lowercase">
                  / {product.volume_ml} ml
                </span>
              )}
            </p>

            <div className="flex items-center gap-1 text-sm text-ink-muted dark:text-stone-400">
              <span className="text-amber-500">★</span>
              <span className="font-semibold text-ink dark:text-bone">{formatRating(product.fragrance.avg_rating)}</span>
              <span className="text-stone-400">({product.fragrance.votes_count} votes)</span>
            </div>
          </div>

          {/* Attributes */}
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {product.gender} · {product.concentration.toUpperCase()}
            {product.perfumers.length > 0 && <> · {product.perfumers.map((p: any) => p.name).join(', ')}</>}
          </p>

          {product.description && <p className="text-ink-muted dark:text-stone-300 leading-relaxed font-sans text-sm md:text-base">{product.description}</p>}

          <PdpBuyBlock product={product} locale={locale} />
          <CompareWishButtons card={card} />
        </div>
      </div>

      <div className="mt-20 border-t border-border pt-12 max-w-4xl mx-auto">
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
