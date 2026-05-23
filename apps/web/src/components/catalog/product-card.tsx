import Link from 'next/link';
import Image from 'next/image';
import type { ProductCard as Card } from '@/lib/api/products';
import { formatUzs, formatRating } from '@/lib/format';

export const ProductCard = ({ product, locale }: { product: Card; locale: string }) => {
  const hasImage = Boolean(product.image);

  return (
    <Link href={`/${locale}/product/${product.slug}`} className="group block space-y-2">
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
            <span className="text-xs uppercase tracking-widest text-stone-400">{product.brand}</span>
          </div>
        )}
      {product.top_accord && (
        <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest text-white" style={{ backgroundColor: product.top_accord.color_hex }}>
          {product.top_accord.name}
        </span>
      )}
    </div>
    <p className="text-xs uppercase tracking-widest text-stone-500">{product.brand}</p>
    <p className="text-sm leading-tight text-stone-900">{product.name}</p>
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1 text-stone-600">
        <span className="text-amber-500">★</span>
        {formatRating(product.avg_rating)}
      </span>
      <span className="font-medium text-stone-900">{formatUzs(product.price, locale)}</span>
    </div>
  </Link>
  );
};
