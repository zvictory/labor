'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { TgMainButton } from './main-button';
import { useCartStore } from '@/lib/stores/cart-store';
import { cn } from '@/lib/cn';
import { formatUzs } from '@/lib/format';
import { getTelegramWebApp } from '@/lib/telegram-webapp';
import type { Product, ProductSize } from '@/lib/api/products';

interface Props {
  product: Product;
  locale: string;
}

export const TgPdpBuyBlock = ({ product, locale }: Props) => {
  const t = useTranslations('tg.pdp');
  const router = useRouter();
  const addLine = useCartStore((s) => s.addLine);

  const defaultSize: ProductSize | undefined =
    product.sizes?.find((s) => s.ml === 30) ?? product.sizes?.at(-1);

  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(defaultSize);

  const displayPrice = selectedSize?.price ?? product.price;
  const variantId = selectedSize?.variant_id ?? product.id;
  const displayMl = selectedSize?.ml ?? product.volume_ml;

  const add = () => {
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
    getTelegramWebApp()?.HapticFeedback?.impactOccurred?.('medium');
    router.push(`/${locale}/tg/cart`);
  };

  return (
    <>
      {/* Size selector */}
      {product.sizes && product.sizes.length > 0 && (
        <div className="flex gap-2">
          {product.sizes.map((size) => (
            <button
              key={size.variant_id}
              type="button"
              onClick={() => setSelectedSize(size)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                selectedSize?.variant_id === size.variant_id
                  ? 'border-[var(--tg-button-color)] bg-[var(--tg-button-color)] text-[var(--tg-button-text-color)]'
                  : 'border-[var(--tg-hint-color)] text-[var(--tg-text-color)]',
              )}
            >
              {size.ml} ml
            </button>
          ))}
        </div>
      )}

      <p className="font-serif text-xl">{formatUzs(displayPrice, locale)}</p>

      <TgMainButton text={`${t('add')} · ${formatUzs(displayPrice, locale)}`} onClick={add} />
    </>
  );
};
