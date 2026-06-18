import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { ProductCard } from '@/components/catalog/product-card';
import { AddToCart } from '@/components/cart/add-to-cart';
import { getReadableTextColor } from '@/components/catalog/color-contrast';
import { getProduct } from '@/lib/catalog/products';
import { formatUzs, formatRating } from '@/lib/money';
import type { Gender, ProductNoteDTO } from '@/lib/catalog/types';

import { AccordsBars } from '@/components/pdp/accords-bars';
import { NotesPyramid } from '@/components/pdp/notes-pyramid';
import { AggregateBars } from '@/components/pdp/aggregate-bars';
import { BRAND_LOGOS } from '@/lib/catalog/brands';
import { PdpStickyBar } from '@/components/pdp/pdp-sticky-bar';

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

type Lang = 'en' | 'ru' | 'uz';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'laborparfum_bot';
const TELEGRAM_URL = `https://t.me/${botUsername}`;

const ORDER_COPY: Record<Lang, string> = {
  ru: 'Заказать в Telegram',
  en: 'Order on Telegram',
  uz: 'Telegramda buyurtma',
};

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const product = await getProduct(slug, locale);
  if (!product) {
    notFound();
  }

  const lang = toLang(locale);
  const tp = await getTranslations('product');
  const tpdp = await getTranslations('pdp');

  const genderLabel: Record<Gender, string> = {
    men: tp('gender.men'),
    women: tp('gender.women'),
    unisex: tp('gender.unisex'),
  };

  const mlCopy: Record<Lang, string> = {
    ru: 'мл',
    uz: 'ml',
    en: 'ml',
  };

  const gallery = product.images.length > 0 ? product.images : [product.image].filter(Boolean);

  return (
    <div className="container py-6 md:py-16 space-y-8">
      {/* Centered Scent Title Block (Fragrantica Style) */}
      <header className="text-center space-y-1 pb-6 border-b border-stone-200/50 dark:border-stone-850">
        <h1 className="font-display text-4xl tracking-tight text-ink dark:text-bone md:text-5xl lg:text-6xl leading-tight">
          {product.name} {product.brand}
        </h1>
        <p className="text-sm font-semibold lowercase tracking-widest text-[#229ED9]">
          {genderLabel[product.gender].toLowerCase()}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-start">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-[4/3] max-h-[320px] sm:max-h-[400px] lg:aspect-[3/4] lg:max-h-none overflow-hidden rounded-lg bg-stone-50">
            {gallery[0] ? (
              <Image
                src={gallery[0]}
                alt={product.name}
                fill
                sizes="(min-width:1024px) 45vw, 100vw"
                priority
                className="object-contain p-6"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-stone-400">
                {product.brand}
              </div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {gallery.slice(0, 4).map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="relative aspect-square overflow-hidden rounded-md border border-border bg-stone-50"
                >
                  <Image
                    src={src}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    sizes="20vw"
                    className="object-contain p-2"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="space-y-6">
          {/* Brand Info (Fragrantica-style top right aligned, next to gallery button) */}
          <div className="flex items-start justify-end gap-4 border-b border-stone-100 pb-4 dark:border-stone-900 w-full">
            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">brand</p>
                  {product.brand_slug ? (
                    <Link
                      href={`/${locale}/catalog?brand=${product.brand_slug}`}
                      className="text-sm font-semibold text-ink dark:text-bone hover:underline"
                    >
                      {product.brand}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-ink dark:text-bone">{product.brand}</span>
                  )}
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                </div>
              </div>
              
              {product.brand_slug && BRAND_LOGOS[product.brand_slug] && (
                <div className="relative h-10 w-28 transition-all duration-300 hover:opacity-85">
                  <Image
                    src={`/brands/${product.brand_slug}.${BRAND_LOGOS[product.brand_slug]}`}
                    alt={product.brand}
                    fill
                    className="object-contain object-right dark:brightness-0 dark:invert"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Accords Bars (Main Accords) */}
          <AccordsBars accords={product.accords} locale={locale} />

          {/* Divider */}
          <div className="border-t border-stone-100 dark:border-stone-900 pt-4" />

          {/* Price & Rating block */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-2xl font-medium text-brass">
              {formatUzs(product.price, locale)}
              {product.volume_ml && (
                <span className="ml-2 text-sm text-stone-400 font-sans font-normal lowercase">
                  / {product.volume_ml} {mlCopy[lang]}
                </span>
              )}
            </p>

            {product.votes_count > 0 && (
              <div className="flex items-center gap-1 text-sm text-ink-muted dark:text-stone-400">
                <span className="text-amber-500">★</span>
                <span className="font-semibold text-ink dark:text-bone">{formatRating(product.avg_rating)}</span>
                <span className="text-stone-400">({product.votes_count} votes)</span>
              </div>
            )}
          </div>

          {/* Attributes */}
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm pt-2">
            <div className="flex items-baseline gap-2">
              <dt className="text-ink-muted dark:text-stone-400">{tp('gender.label')}:</dt>
              <dd className="text-ink dark:text-bone">{genderLabel[product.gender]}</dd>
            </div>
            {product.concentration && (
              <div className="flex items-baseline gap-2">
                <dt className="text-ink-muted dark:text-stone-400">{tp('concentration')}:</dt>
                <dd className="text-ink dark:text-bone">{product.concentration}</dd>
              </div>
            )}
            {product.perfumers.length > 0 && (
              <div className="flex items-baseline gap-2">
                <dt className="text-ink-muted dark:text-stone-400">{tp('perfumer')}:</dt>
                <dd className="text-ink dark:text-bone flex flex-wrap gap-1.5">
                  {product.perfumers.map((p, idx) => (
                    <span key={p.slug}>
                      <Link
                        href={`/${locale}/catalog?perfumer=${p.slug}`}
                        className="hover:text-brass hover:underline"
                      >
                        {p.name}
                      </Link>
                      {idx < product.perfumers.length - 1 && ', '}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          {product.description && (
            <p className="max-w-prose text-sm leading-relaxed text-ink-muted dark:text-stone-400 pt-2">
              {product.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-start border-t border-stone-100 dark:border-stone-900">
            {/* Cart client island — POSTs /api/cart, sample = ~8% decant. */}
            <AddToCart productId={product.id} locale={locale} hasSample />
            <a
              href={TELEGRAM_URL}
              className="inline-flex h-12 items-center justify-center gap-2 border border-[#229ED9] px-7 text-xs font-semibold uppercase tracking-widest text-[#1c7fb0] transition-colors hover:bg-[#229ED9] hover:text-white"
            >
              {ORDER_COPY[lang]}
            </a>
          </div>
        </div>
      </div>

      {/* Scent Pyramid visual chart (Fragrantica-style, centered at bottom) */}
      <div className="mt-20 border-t border-border pt-12 max-w-4xl mx-auto">
        <NotesPyramid notes={product.notes} locale={locale} />
      </div>

      {/* Season & Time aggregate voting bars */}
      {(Object.keys(product.seasons).length > 0 ||
        Object.keys(product.time).length > 0 ||
        Object.keys(product.love).length > 0) && (
        <div className="mt-16 border-t border-border pt-12">
          <AggregateBars
            seasons={product.seasons as any}
            time={product.time as any}
            love={product.love as any}
            votesCount={product.votes_count}
          />
        </div>
      )}

      {/* Visual Creator Profile & Brand Heritage Block */}
      <section className="mt-20 border-t border-border pt-16 space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-12">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
            CREATION & HERITAGE
          </span>
          <h2 className="font-display text-3xl text-ink dark:text-bone">
            Behind the Fragrance
          </h2>
          <p className="text-xs uppercase tracking-widest text-stone-400">
            Learn about the house and creators of this scent
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Brand Profile Card */}
          <div className="flex flex-col justify-between border border-border bg-stone-50/40 dark:bg-stone-900/5 p-8 rounded-lg space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-brass font-bold">
                  THE FRAGRANCE HOUSE
                </span>
                {product.brand_slug && (
                  <Link
                    href={`/${locale}/catalog?brand=${product.brand_slug}`}
                    className="text-xs uppercase tracking-widest text-brass hover:underline"
                  >
                    View Collection →
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-6">
                {product.brand_slug && BRAND_LOGOS[product.brand_slug] ? (
                  <div className="relative h-16 w-36 bg-bone rounded border border-border/40 p-2 dark:bg-[#1A1714] overflow-hidden">
                    <Image
                      src={`/brands/${product.brand_slug}.${BRAND_LOGOS[product.brand_slug]}`}
                      alt={product.brand}
                      fill
                      className="object-contain p-1 dark:brightness-0 dark:invert"
                    />
                  </div>
                ) : (
                  <h3 className="font-display text-3xl text-ink dark:text-bone">
                    {product.brand}
                  </h3>
                )}
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-ink dark:text-bone">{product.brand}</p>
                  <p className="text-xs text-ink-muted dark:text-stone-400">Official Distributor</p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-ink-muted leading-relaxed dark:text-stone-400">
              Discover the unique heritage and artisanal craftsmanship of {product.brand}. Every bottle represents an olfactory journey crafted from the finest ingredients, now exclusively curated for our collectors in Uzbekistan.
            </p>
          </div>

          {/* Perfumers Profile Card */}
          <div className="flex flex-col justify-between border border-border bg-stone-50/40 dark:bg-stone-900/5 p-8 rounded-lg space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-brass font-bold">
                THE NOSE / PERFUMERS
              </span>
              
              {product.perfumers.length > 0 ? (
                <div className="space-y-4">
                  {product.perfumers.map((perfumer) => {
                    return (
                      <div key={perfumer.slug} className="flex items-center gap-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border bg-stone-100 shadow-sm shrink-0">
                          <Image
                            src={`/perfumers/${perfumer.slug}.jpg`}
                            alt={perfumer.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-serif text-lg leading-tight text-ink dark:text-bone">
                            {perfumer.name}
                          </h4>
                          <Link
                            href={`/${locale}/catalog?perfumer=${perfumer.slug}`}
                            className="inline-block text-xs uppercase tracking-widest text-brass hover:underline"
                          >
                            Explore Scent Portfolio →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-sm text-ink-muted dark:text-stone-400 italic">
                  The nose details for this fragrance are currently anonymous or undisclosed.
                </div>
              )}
            </div>

            {product.perfumers.length > 0 && (
              <p className="text-sm text-ink-muted leading-relaxed dark:text-stone-400">
                Created by renowned master perfumers, this scent combines traditional methods with contemporary ingredients to deliver a long-lasting, sophisticated experience.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Similar products */}
      {product.similar.length > 0 && (
        <section className="mt-20 border-t border-border pt-12">
          <h2 className="mb-8 font-display text-3xl text-ink dark:text-bone">
            {tpdp('similar.title')}
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {product.similar.map((sim) => (
              <ProductCard key={sim.id} product={sim} locale={locale} />
            ))}
          </div>
        </section>
      )}
      <PdpStickyBar
        productId={product.id}
        slug={product.slug}
        name={product.name}
        brand={product.brand}
        price={product.price}
        image={product.image}
        locale={locale}
      />
    </div>
  );
}

function PyramidLayer({
  title,
  notes,
  locale,
}: {
  title: string;
  notes: ProductNoteDTO[];
  locale: string;
}) {
  if (notes.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {notes.map((note) => (
          <li key={note.slug}>
            <Link
              href={`/${locale}/catalog?note=${note.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-ink transition-colors hover:border-brass/60 hover:text-brass dark:text-bone"
            >
              {note.color_hex && (
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: note.color_hex }}
                  aria-hidden
                />
              )}
              {note.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
