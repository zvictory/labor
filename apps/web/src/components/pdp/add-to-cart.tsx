'use client';

import { useTranslations } from 'next-intl';
import { useCartStore } from '@/lib/stores/cart-store';
import type { Product } from '@/lib/api/products';

interface Props {
  product: Product;
  locale: string;
}

export const AddToCart = ({ product, locale: _locale }: Props) => {
  const t = useTranslations('pdp.cart');
  const addLine = useCartStore((s) => s.addLine);

  const add = () => {
    addLine({
      product_id: product.id,
      variant_id: product.id, // master variant for v1
      slug: product.slug,
      name: product.name,
      brand: product.brand.name,
      volume_ml: product.volume_ml,
      image: product.images[0]?.url ?? '',
      price: product.price,
      quantity: 1,
    });
  };

  return (
    <button
      type="button"
      onClick={add}
      className="w-full rounded-full bg-stone-900 px-6 py-4 text-sm font-medium uppercase tracking-widest text-white transition hover:bg-stone-800"
    >
      {t('add')}
    </button>
  );
};
