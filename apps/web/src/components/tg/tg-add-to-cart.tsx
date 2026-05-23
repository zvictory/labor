'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { TgMainButton } from './main-button';
import { useCartStore } from '@/lib/stores/cart-store';
import type { Product } from '@/lib/api/products';
import { formatUzs } from '@/lib/format';
import { getTelegramWebApp } from '@/lib/telegram-webapp';

export const TgAddToCart = ({ product, locale }: { product: Product; locale: string }) => {
  const t = useTranslations('tg.pdp');
  const router = useRouter();
  const addLine = useCartStore((s) => s.addLine);

  const add = () => {
    addLine({
      product_id: product.id,
      variant_id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand.name,
      volume_ml: product.volume_ml,
      image: product.images[0]?.url ?? '',
      price: product.price,
      quantity: 1,
    });
    getTelegramWebApp()?.HapticFeedback?.impactOccurred?.('medium');
    router.push(`/${locale}/tg/cart`);
  };

  return <TgMainButton text={`${t('add')} · ${formatUzs(product.price, locale)}`} onClick={add} />;
};
