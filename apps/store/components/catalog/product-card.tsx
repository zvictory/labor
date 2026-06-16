import Link from 'next/link';
import Image from 'next/image';

import type { ProductCardDTO } from '@/lib/catalog/types';
import { formatUzs, formatRating } from '@/lib/money';
import { getReadableTextColor } from '@/components/catalog/color-contrast';
import { AddToCartIcon } from '@/components/cart/add-to-cart';

// Presentational catalog card. Server-safe (no client hooks). Consumes the new
// data-access ProductCardDTO directly — `votes_count === 0` hides the rating row,
// and `top_accord` renders a contrast-corrected color badge.
export const ProductCard = ({
  product,
  locale,
}: {
  product: ProductCardDTO;
  locale: string;
}) => {
  const hasImage = Boolean(product.image);

  return (
    <div className="group relative space-y-2">
      <AddToCartIcon productId={product.id} locale={locale} />
      <Link href={`/${locale}/product/${product.slug}`} className="block space-y-2">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-50">
        {hasImage ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
            className="object-contain p-4 transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-stone-100">
            <span className="text-xs uppercase tracking-widest text-stone-400">
              {product.brand}
            </span>
          </div>
        )}
        {product.top_accord && (
          <span
            className="absolute left-2 top-2 rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest shadow-sm"
            style={{
              backgroundColor: product.top_accord.color_hex,
              color: getReadableTextColor(product.top_accord.color_hex),
            }}
          >
            {product.top_accord.name}
          </span>
        )}
      </div>
      <p className="text-xs uppercase tracking-widest text-stone-500">{product.brand}</p>
      <p className="text-sm leading-tight text-stone-900">{product.name}</p>
      <div className="flex items-center justify-between text-xs">
        {product.votes_count > 0 ? (
          <span className="flex items-center gap-1 text-stone-600">
            <span className="text-amber-500">★</span>
            {formatRating(product.avg_rating)}
            <span className="text-stone-400">· {product.votes_count}</span>
          </span>
        ) : (
          <span />
        )}
        <span className="font-medium text-stone-900">{formatUzs(product.price, locale)}</span>
      </div>
      </Link>
    </div>
  );
};
