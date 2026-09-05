import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import type { ProductCardDTO } from '@/lib/catalog/types';
import { formatUzs } from '@/lib/money';
import { StarRating } from '@/components/catalog/star-rating';
import { AddToCartIcon } from '@/components/cart/add-to-cart';

// The screen form of the shop's 24 × 32 mm tester label: code line, name,
// accord, tick scale, price. Same four rows, same order, same mono face — so
// the bottle a customer picks up off the island and the card they open on their
// phone are recognisably the same object.
//
// Gone on purpose: the coloured accord badge (70/20/10), rounded corners and
// the shadow (nothing on a laboratory label is raised or rounded). The stars
// are drawn in the label's own two colours rather than gold — see
// components/catalog/star-rating.tsx — and the vote count beside them on the
// product page says whose votes they are.

export const ProductCard = ({ product, locale }: { product: ProductCardDTO; locale: string }) => {
  const t = useTranslations('product');
  const hasImage = Boolean(product.image);
  const codeLine = [
    product.brand,
    product.concentration,
    product.volume_ml ? `${product.volume_ml} ml` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="group border-hairline bg-background hover:border-graphite dark:border-gunmetal dark:hover:border-offwhite relative border transition-colors duration-200">
      <div className="absolute top-3 right-3 z-10">
        <AddToCartIcon productId={product.id} locale={locale} />
      </div>

      <Link href={`/${locale}/product/${product.slug}`} className="block">
        <div className="border-hairline dark:border-gunmetal relative aspect-[3/4] w-full overflow-hidden border-b">
          {hasImage ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
              className="object-contain p-6 mix-blend-multiply dark:mix-blend-normal"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-muted-foreground text-micro font-mono tracking-[0.16em] uppercase">
                {product.brand}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 p-4">
          <p className="text-muted-foreground text-micro font-mono tracking-[0.12em] uppercase">
            {codeLine}
          </p>

          <p className="line-clamp-1 text-sm font-semibold tracking-[-0.01em]">{product.name}</p>

          <p className="text-muted-foreground text-label font-mono leading-4">
            {product.top_accord?.name ?? ' '}
          </p>

          <StarRating value={product.avg_rating} label="Rating" size="sm" className="pt-0.5" />

          {/* Two cells that must never break mid-value: at 2-up on a phone the
              row folds into two clean lines instead of splitting the price. */}
          <div className="border-hairline dark:border-gunmetal flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t pt-2 font-mono">
            <span className="text-muted-foreground text-micro tracking-[0.12em] whitespace-nowrap uppercase">
              {product.votes_count > 0 ? t('votes', { count: product.votes_count }) : t('inStore')}
            </span>
            <span className="text-foreground text-sm font-semibold whitespace-nowrap">
              {formatUzs(product.price, locale)}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
};
