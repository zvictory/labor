'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useCartStore } from '@/lib/stores/cart-store';
import { track } from '@/lib/analytics/track';
import { formatUzs } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Product, ProductSize } from '@/lib/api/products';

interface Props {
  product: Product;
  locale: string;
}

// Replaces the bare price <p> + <AddToCart> pair on the PDP.
// Owns size-selector state, reactive price display, and the correct variant_id.
export const PdpBuyBlock = ({ product, locale }: Props) => {
  const t = useTranslations('pdp.cart');
  const addLine = useCartStore((s) => s.addLine);

  // Default to 30 ml when sizes are available (the largest / "full" option).
  const defaultSize: ProductSize | undefined =
    product.sizes?.find((s) => s.ml === 30) ?? product.sizes?.at(-1);

  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(defaultSize);

  // Derived display values — update reactively when size changes.
  const displayPrice = selectedSize?.price ?? product.price;
  const variantId = selectedSize?.variant_id ?? product.id;
  const displayMl = selectedSize?.ml ?? product.volume_ml;

  useEffect(() => {
    track({
      name: 'ViewContent',
      payload: { id: product.id, name: product.name, price: displayPrice, quantity: 1 },
    });
    // Fire once per product view, not per size change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const add = () => {
    track({
      name: 'AddToCart',
      payload: { id: product.id, name: product.name, price: displayPrice, quantity: 1 },
    });
    addLine({
      product_id: product.id,
      variant_id: variantId,
      slug: product.slug,
      name: product.name,
      brand: product.brand.name,
      volume_ml: displayMl,
      image: product.images[0]?.url ?? '',
      price: displayPrice,
      quantity: 1,
    });
  };

  return (
    <div className="space-y-4">
      {/* Size selector — rendered only when size variants have been generated */}
      {product.sizes && product.sizes.length > 0 && (
        <div className="flex gap-2">
          {product.sizes.map((size) => (
            <button
              key={size.variant_id}
              type="button"
              onClick={() => setSelectedSize(size)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium transition',
                selectedSize?.variant_id === size.variant_id
                  ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                  : 'border-stone-300 text-stone-700 hover:border-stone-600 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-400',
              )}
            >
              {size.ml} ml
            </button>
          ))}
        </div>
      )}

      {/* Price — reactive to whichever size is selected */}
      <p className="font-sans font-semibold text-3xl text-brass">
        {formatUzs(displayPrice, locale)}
      </p>

      <button
        type="button"
        onClick={add}
        className="w-full rounded-full bg-stone-900 px-6 py-4 text-sm font-medium uppercase tracking-widest text-white transition hover:bg-stone-800"
      >
        {t('add')}
      </button>
    </div>
  );
};
