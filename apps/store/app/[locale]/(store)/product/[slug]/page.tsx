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

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

type Lang = 'en' | 'ru' | 'uz';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

const TELEGRAM_URL = 'https://t.me/labor_uz_bot';

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

  const gallery = product.images.length > 0 ? product.images : [product.image].filter(Boolean);

  return (
    <div className="container py-10 md:py-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-50">
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
          <div className="space-y-2">
            {product.brand_slug ? (
              <Link
                href={`/${locale}/catalog?brand=${product.brand_slug}`}
                className="text-xs uppercase tracking-widest text-brass hover:underline"
              >
                {product.brand}
              </Link>
            ) : (
              <p className="text-xs uppercase tracking-widest text-ink-muted dark:text-stone-400">
                {product.brand}
              </p>
            )}
            <h1 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
              {product.name}
            </h1>
            <div className="flex items-center gap-4 pt-1">
              {product.votes_count > 0 && (
                <span className="flex items-center gap-1 text-sm text-ink-muted dark:text-stone-400">
                  <span className="text-amber-500">★</span>
                  {formatRating(product.avg_rating)}
                  <span className="text-stone-400">· {product.votes_count}</span>
                </span>
              )}
            </div>
          </div>

          <p className="text-2xl font-medium text-ink dark:text-bone">
            {formatUzs(product.price, locale)}
          </p>

          {/* Attributes */}
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
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
                <dd className="text-ink dark:text-bone">
                  {product.perfumers.map((p) => p.name).join(', ')}
                </dd>
              </div>
            )}
          </dl>

          {product.description && (
            <p className="max-w-prose text-sm leading-relaxed text-ink-muted dark:text-stone-400">
              {product.description}
            </p>
          )}

          {/* Accords */}
          {product.accords.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
                {tpdp('accords.title')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {product.accords.map((accord) => (
                  <span
                    key={accord.name}
                    className="rounded-full border border-black/5 px-3 py-1 text-xs font-medium uppercase tracking-wide shadow-sm"
                    style={
                      accord.color_hex
                        ? {
                            backgroundColor: accord.color_hex,
                            color: getReadableTextColor(accord.color_hex),
                          }
                        : undefined
                    }
                  >
                    {accord.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-start">
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

      {/* Scent pyramid */}
      {(product.notes.top.length > 0 ||
        product.notes.middle.length > 0 ||
        product.notes.base.length > 0) && (
        <section className="mt-20 border-t border-border pt-12">
          <h2 className="mb-8 font-display text-3xl text-ink dark:text-bone">
            {tpdp('pyramid.title')}
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <PyramidLayer title={tpdp('pyramid.top')} notes={product.notes.top} locale={locale} />
            <PyramidLayer
              title={tpdp('pyramid.heart')}
              notes={product.notes.middle}
              locale={locale}
            />
            <PyramidLayer title={tpdp('pyramid.base')} notes={product.notes.base} locale={locale} />
          </div>
        </section>
      )}

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
