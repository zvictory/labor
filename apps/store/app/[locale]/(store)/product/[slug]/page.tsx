import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { ProductCard } from '@/components/catalog/product-card';
import { AccordBarList } from '@/components/catalog/accord-bar-list';
import { ProductRecord } from '@/components/catalog/product-record';
import { StarRating } from '@/components/catalog/star-rating';
import { AddToCart } from '@/components/cart/add-to-cart';
import { getProduct } from '@/lib/catalog/products';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';
import { formatUzs, formatRating, PRICE_PER_ML, SAMPLE_ML } from '@/lib/money';
import type { Gender } from '@/lib/catalog/types';

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

const TELEGRAM_URL = 'https://t.me/labor_uz_bot';

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const product = await getProduct(slug, locale);
  if (!product) {
    notFound();
  }

  const tp = await getTranslations('product');
  const tpdp = await getTranslations('pdp');

  const genderLabel: Record<Gender, string> = {
    men: tp('gender.men'),
    women: tp('gender.women'),
    unisex: tp('gender.unisex'),
  };

  const gallery = product.images.length > 0 ? product.images : [product.image].filter(Boolean);

  return (
    <div className="container space-y-16 py-10 md:py-16">
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery Section */}
        <div className="sticky top-24 space-y-4">
          <div className="border-border bg-background relative aspect-[3/4] overflow-hidden border p-6">
            {gallery[0] ? (
              <Image
                src={gallery[0]}
                alt={product.name}
                fill
                sizes="(min-width:1024px) 45vw, 100vw"
                priority
                className="object-contain p-6 mix-blend-multiply dark:mix-blend-normal"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-muted-foreground text-micro font-mono tracking-[0.16em] uppercase">
                  {product.brand}
                </span>
              </div>
            )}

            {product.concentration && (
              <span className="bg-foreground text-background text-micro absolute top-4 right-4 px-3 py-1 font-mono tracking-[0.16em] uppercase">
                {product.concentration}
              </span>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {gallery.slice(0, 4).map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="border-border bg-background relative aspect-square overflow-hidden border p-1"
                >
                  <Image
                    src={src}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    sizes="20vw"
                    className="object-contain p-1 mix-blend-multiply dark:mix-blend-normal"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details & Specifications */}
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {product.brand_slug ? (
                <Link
                  href={taxonomyHref('brand', locale, product.brand_slug)}
                  className="text-muted-foreground hover:text-foreground text-label font-mono tracking-[0.16em] uppercase"
                >
                  {product.brand}
                </Link>
              ) : (
                <p className="text-muted-foreground text-label font-mono tracking-[0.16em] uppercase">
                  {product.brand}
                </p>
              )}
              <span className="text-muted-foreground text-label font-mono tracking-[0.16em] uppercase">
                {genderLabel[product.gender]}
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
              {product.name}
            </h1>

            {/* Stars, because a star is what a rating looks like. The
                provenance is the thing that needed handling, not the shape:
                the count beside them says whose votes these are, and the full
                record repeats it. */}
            <div className="flex items-center gap-4 pt-1">
              {product.votes_count > 0 && (
                <div className="flex items-center gap-3">
                  <StarRating value={product.avg_rating} label="Rating" />
                  <span className="text-muted-foreground text-label font-mono tracking-[0.12em] uppercase">
                    {formatRating(product.avg_rating)} / 5 · {product.votes_count} votes
                  </span>
                </div>
              )}
            </div>

            {/* Price and the volume it buys, on one baseline — the shop
                quotes 16 000 so'm per ml, so 10 ml is 160 000. */}
            <div className="flex flex-col gap-1 pt-2">
              <span className="font-mono text-2xl font-semibold tabular-nums">
                {formatUzs(product.price, locale)}
              </span>
              {product.volume_ml ? (
                <span className="text-label font-mono tracking-[0.16em] uppercase">
                  {product.volume_ml} ml decant · {formatUzs(PRICE_PER_ML, locale)} per ml
                </span>
              ) : null}
            </div>
          </div>

          {product.description && (
            <p className="text-muted-foreground max-w-prose font-serif text-base leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Main Accords Bars */}
          {product.accords.length > 0 && <AccordBarList accords={product.accords} />}

          {/* Cart & Order Actions */}
          <div className="border-border flex flex-col gap-3 border-t pt-5">
            <AddToCart
              productId={product.id}
              locale={locale}
              hasSample
              volumeMl={product.volume_ml ?? null}
              sampleMl={SAMPLE_ML}
            />

            {/* The label carries provenance. One mono line, under the action,
                where the decision is actually made — not a block seven
                sections down the home page. */}
            <p className="text-muted-foreground text-micro font-mono leading-relaxed tracking-[0.12em] uppercase">
              {tpdp('trustLine')}
            </p>

            {/* Telegram is a channel, not a third peer button. */}
            <p className="text-muted-foreground text-xs">
              Prefer Telegram?{' '}
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="text-foreground font-medium underline underline-offset-4"
              >
                Order there instead
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Layer two — everything that is reference rather than label */}
      <ProductRecord
        notes={product.notes}
        perfumers={product.perfumers}
        locale={locale}
        avgRating={product.avg_rating}
        avgLongevity={product.avg_longevity}
        avgSillage={product.avg_sillage}
        votesCount={product.votes_count}
      />

      {/* Similar Fragrances Carousel / Grid */}
      {product.similar.length > 0 && (
        <section className="space-y-6 border-t border-stone-200 pt-12">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">{tpdp('similar.title')}</h2>
              <p className="mt-1 text-xs tracking-widest text-stone-500 uppercase">
                Explore Fragrances with Similar Olfactive Signatures
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
            {product.similar.map((sim) => (
              <ProductCard key={sim.id} product={sim} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
