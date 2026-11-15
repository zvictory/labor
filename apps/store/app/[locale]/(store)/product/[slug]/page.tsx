import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { ProductCard } from '@/components/catalog/product-card';
import { OlfactivePyramidView } from '@/components/catalog/olfactive-pyramid-view';
import { ProductRecord } from '@/components/catalog/product-record';
import { StarRating } from '@/components/catalog/star-rating';
import { AddToCart } from '@/components/cart/add-to-cart';
import { ConsultForm } from '@/components/consult/consult-form';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { ProductReviews } from '@/components/reviews/product-reviews';
import { TrackEvent } from '@/components/analytics/track-event';
import { getProductReviews } from '@/lib/reviews/reviews';
import { collapseVolumeListings, listingSlug } from '@/lib/catalog/product-formats';
import { getProduct, getProductFormats } from '@/lib/catalog/products';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';
import { formatUzs, formatRating, SAMPLE_ML, SAMPLE_PRICE } from '@/lib/money';
import { TELEGRAM_URL } from '@/lib/telegram';
import { describeProduct } from '@/lib/catalog/product-description';
import { getProductStory } from '@/lib/catalog/stories';
import { jsonLdScript, pageMetadata, productJsonLd } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ size?: string | string[] }>;
};

const STORY_LINK = {
  ru: 'История аромата',
  uz: 'Atir hikoyasi',
  en: 'The story of this perfume',
} as const;

const loadProduct = cache(getProduct);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const canonicalSlug = listingSlug(slug);
  const product = await loadProduct(canonicalSlug, locale);
  if (!product) return {};

  return pageMetadata({
    locale,
    path: `/product/${canonicalSlug}`,
    title: product.brand ? `${product.name} — ${product.brand}` : product.name,
    description: describeProduct(product, locale),
    images: product.image ? [product.image] : [],
  });
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ locale, slug }, { size }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const canonicalSlug = listingSlug(slug);
  const path = `/${locale}/product/${canonicalSlug}`;
  const [product, { sizes, related }] = await Promise.all([
    loadProduct(canonicalSlug, locale),
    getProductFormats(canonicalSlug, locale),
  ]);
  if (!product) notFound();

  const fullSizes = sizes.length
    ? sizes
    : product.active !== false && product.volume_ml && !product.separate_format
      ? [{ id: product.id, slug: product.slug, ml: product.volume_ml, price: product.price }]
      : [];
  const preferred = fullSizes.find((option) => option.slug === canonicalSlug) ?? fullSizes[0];
  const canSample = !product.separate_format && product.active !== false;
  const sampleHref = `${path}?size=${SAMPLE_ML}`;
  const isSample = canSample && size === String(SAMPLE_ML);
  const requested = fullSizes.find((option) => String(option.ml) === size);
  const optionHref = (option: { slug: string; ml: number }) =>
    option.slug === preferred?.slug ? path : `${path}?size=${option.ml}`;

  if (slug !== canonicalSlug) {
    const legacy = fullSizes.find((option) => option.slug === slug);
    redirect(isSample ? sampleHref : legacy ? optionHref(legacy) : path);
  }
  if (size !== undefined && !isSample && (!requested || requested.slug === preferred?.slug)) {
    redirect(path);
  }

  const selected = requested ?? preferred;
  const selectedId = isSample ? product.id : (selected?.id ?? product.id);
  const price = isSample ? SAMPLE_PRICE : (selected?.price ?? product.price);
  const volume = isSample ? SAMPLE_ML : (selected?.ml ?? product.volume_ml);
  const purchasable = Boolean(selected) || product.active !== false;
  const sizeOptions = [
    ...(canSample ? [{ key: 'sample', href: sampleHref, ml: SAMPLE_ML, current: isSample }] : []),
    ...(canSample && !fullSizes.length
      ? [{ key: 'full', href: path, ml: null, current: !isSample }]
      : []),
    ...fullSizes.map((option) => ({
      key: option.slug,
      href: optionHref(option),
      ml: option.ml,
      current: !isSample && option.slug === selected?.slug,
    })),
  ];
  const gallery = product.images.length ? product.images : [product.image].filter(Boolean);
  const description = describeProduct(product, locale);
  const [tp, tpdp, tconsult, { summary: ownRating, reviews }] = await Promise.all([
    getTranslations('product'),
    getTranslations('pdp'),
    getTranslations('consult'),
    getProductReviews(product.id),
  ]);
  const packageSize = product.package_size;
  const similar = collapseVolumeListings(product.similar).filter(
    (item) => listingSlug(item.slug) !== canonicalSlug,
  );

  return (
    <div className="container mx-auto max-w-7xl space-y-12 py-6 md:space-y-16 md:py-12">
      <TrackEvent
        event="view_item"
        params={{ item_id: String(selectedId), value: price, currency: 'UZS' }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(productJsonLd(product, locale, description, ownRating)),
        }}
      />

      <div className="grid items-start gap-6 md:grid-cols-[1.15fr_1fr] md:gap-10 lg:gap-20">
        <div className="space-y-3">
          <div className="border-border bg-background relative aspect-[5/4] overflow-hidden border md:aspect-square">
            {gallery[0] ? (
              <Image
                src={gallery[0]}
                alt={product.name}
                fill
                sizes="(min-width: 1280px) 640px, (min-width: 768px) 52vw, 100vw"
                priority
                className="object-contain p-5 mix-blend-multiply md:p-10 dark:mix-blend-normal"
              />
            ) : (
              <span className="eyebrow absolute inset-0 grid place-items-center">
                {product.brand}
              </span>
            )}
          </div>
          {gallery.length > 1 ? (
            <div className="grid grid-cols-4 gap-3">
              {gallery.slice(1, 5).map((src, i) => (
                <div key={`${src}-${i}`} className="border-border relative aspect-square border">
                  <Image
                    src={src}
                    alt={`${product.name} ${i + 2}`}
                    fill
                    sizes="140px"
                    className="object-contain p-2"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 space-y-6 md:py-4">
          <div className="space-y-2">
            {product.brand_slug ? (
              <Link
                href={taxonomyHref('brand', locale, product.brand_slug)}
                className="eyebrow underline-offset-4 hover:underline"
              >
                {product.brand}
              </Link>
            ) : product.brand ? (
              <p className="eyebrow">{product.brand}</p>
            ) : null}
            <h1 className="page-title">{product.name}</h1>
            <p className="text-muted-foreground flex flex-wrap gap-2 font-mono text-xs uppercase">
              {[product.concentration, tp(`gender.${product.gender}`)].filter(Boolean).join(' · ')}
            </p>
          </div>

          <div className="border-border space-y-4 border-y py-5">
            {sizeOptions.length ? (
              <fieldset className="space-y-2">
                <legend className="eyebrow mb-2">{tpdp('availableSizes')}</legend>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((option) => (
                    <Link
                      key={option.key}
                      href={option.href}
                      scroll={false}
                      aria-current={option.current ? 'true' : undefined}
                      className="border-border hover:border-foreground focus-visible:outline-foreground aria-[current=true]:border-foreground aria-[current=true]:bg-foreground aria-[current=true]:text-background inline-flex min-h-11 min-w-20 items-center justify-center border px-4 font-mono text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {option.key === 'sample'
                        ? tpdp('sampleSize', { amount: SAMPLE_ML })
                        : option.ml === null
                          ? tpdp('fullSize')
                          : tpdp('packageMl', { amount: option.ml })}
                    </Link>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1" aria-live="polite">
              <span className="font-mono text-2xl font-semibold tabular-nums md:text-3xl">
                {formatUzs(price, locale)}
              </span>
              {packageSize ? (
                <span className="text-muted-foreground font-mono text-sm">
                  {tpdp(packageSize.unit === 'g' ? 'packageGrams' : 'packageMl', {
                    amount: packageSize.amount,
                  })}
                </span>
              ) : null}
            </div>

            {purchasable ? (
              <AddToCart
                key={`${selectedId}:${isSample}`}
                productId={selectedId}
                locale={locale}
                isSample={isSample}
                volumeMl={volume ?? null}
              />
            ) : null}
            <WishlistButton productId={product.id} variant="full" />
          </div>

          {product.votes_count > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <StarRating value={product.avg_rating} label={tpdp('rating')} />
              <span className="text-muted-foreground font-mono text-xs">
                {formatRating(product.avg_rating)} / 5 ·{' '}
                {tpdp('votes', { count: product.votes_count })}
              </span>
            </div>
          ) : null}
          <details className="text-sm">
            <summary className="cursor-pointer font-medium underline underline-offset-4">
              {tconsult('toggle')}
            </summary>
            <div className="space-y-4 pt-3">
              <p className="text-muted-foreground">
                {tpdp('telegramPrompt')}{' '}
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline underline-offset-4"
                >
                  {tpdp('telegramLink')}
                </a>
              </p>
              <ConsultForm
                locale={locale}
                source="product"
                productSlug={product.slug}
                showHeading={false}
              />
            </div>
          </details>
        </div>
      </div>

      <div className="border-border grid min-w-0 gap-8 border-t pt-8 md:grid-cols-2 md:gap-12 md:pt-12">
        <OlfactivePyramidView notes={product.notes} locale={locale} />
        <div className="space-y-4">
          {description ? (
            <p className="body-copy text-muted-foreground font-serif">{description}</p>
          ) : null}
          {getProductStory(product.slug) ? (
            <Link
              href={`/${locale}/product/${product.slug}/story`}
              className="text-sm font-medium underline underline-offset-4"
            >
              {STORY_LINK[locale]} →
            </Link>
          ) : null}
        </div>
      </div>

      <ProductRecord
        perfumers={product.perfumers}
        locale={locale}
        avgRating={product.avg_rating}
        avgLongevity={product.avg_longevity}
        avgSillage={product.avg_sillage}
        votesCount={product.votes_count}
      />
      <ProductReviews
        productId={product.id}
        slug={product.slug}
        locale={locale}
        summary={ownRating}
        reviews={reviews}
      />

      {related.length ? (
        <section className="border-border space-y-4 border-t pt-8">
          <h2 className="section-title">{tpdp('relatedFormats')}</h2>
          <ul className="space-y-3">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  className="text-sm underline underline-offset-4"
                  href={`/${locale}/product/${item.slug}`}
                >
                  {[item.brand, item.name].filter(Boolean).join(' · ')}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {similar.length ? (
        <section className="border-border space-y-6 border-t pt-8">
          <h2 className="section-title">{tpdp('similar.title')}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
            {similar.map((item) => (
              <ProductCard key={item.id} product={item} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
