import { notFound } from 'next/navigation';
import Image from 'next/image';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getProduct } from '@/lib/api/products';
import { ApiError } from '@/lib/api/client';
import { NotesPyramid } from '@/components/pdp/notes-pyramid';
import { AccordsBars } from '@/components/pdp/accords-bars';
import { TgAddToCart } from '@/components/tg/tg-add-to-cart';
import { TgBackButton } from '@/components/tg/back-button';
import { formatRating, formatUzs } from '@/lib/format';

interface Props { params: Promise<{ locale: string; slug: string }> }

export default async function TgProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pdp');

  let product;
  try {
    product = (await getProduct(slug, locale)).data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="space-y-5">
      <TgBackButton />
      {product.images[0] && (
        <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-50">
          <Image src={product.images[0].url} alt={product.name} fill sizes="100vw" className="object-cover" priority />
        </div>
      )}
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-[var(--tg-hint-color)]">{product.brand.name}</p>
        <h1 className="font-serif text-2xl">{product.name}</h1>
        <p className="text-xs text-[var(--tg-hint-color)]">
          {product.gender} · {product.concentration.toUpperCase()} · {product.volume_ml} ml
        </p>
        <p className="text-sm">
          <span className="text-amber-500">★</span> {formatRating(product.fragrance.avg_rating)} · {product.fragrance.votes_count} {t('votes')}
        </p>
      </header>

      <p className="font-serif text-xl">{formatUzs(product.price, locale)}</p>

      <AccordsBars accords={product.fragrance.accords} />
      <NotesPyramid notes={product.fragrance.notes} locale={locale} />

      <TgAddToCart product={product} locale={locale} />
    </div>
  );
}
