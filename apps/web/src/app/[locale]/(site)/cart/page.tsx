'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const CartView = dynamic(
  () => import('./cart-view').then((m) => m.CartView),
  { ssr: false },
);

export default function CartPage() {
  const t = useTranslations('cart');

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 space-y-8">
      <h1 className="font-serif text-4xl tracking-tight">{t('title')}</h1>
      <CartView />
    </main>
  );
}
