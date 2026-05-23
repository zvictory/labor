'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCartStore } from '@/lib/stores/cart-store';
import { TgMainButton } from '@/components/tg/main-button';
import { formatUzs } from '@/lib/format';

export default function TgCartPage() {
  const t = useTranslations('tg.cart');
  const locale = useLocale();
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const total = useCartStore((s) => s.total());

  if (lines.length === 0) {
    return (
      <div className="space-y-3 py-12 text-center">
        <h1 className="font-serif text-2xl">{t('empty.title')}</h1>
        <p className="text-sm text-[var(--tg-hint-color)]">{t('empty.body')}</p>
        <button onClick={() => router.push(`/${locale}/tg/catalog`)} className="mt-4 rounded-full bg-[var(--tg-button-color)] px-6 py-3 text-sm text-[var(--tg-button-text-color)]">
          {t('empty.cta')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl">{t('title')}</h1>
      <ul className="space-y-3">
        {lines.map((l) => (
          <li key={l.variant_id} className="flex gap-3 rounded-lg border border-[var(--tg-hint-color)]/15 p-2">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-stone-50">
              <Image src={l.image} alt={l.name} fill sizes="80px" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--tg-hint-color)]">{l.brand}</p>
                <p className="text-sm">{l.name}</p>
                <p className="text-xs text-[var(--tg-hint-color)]">{l.volume_ml} ml</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantity(l.variant_id, l.quantity - 1)} className="h-7 w-7 rounded-full border border-[var(--tg-hint-color)]/30">−</button>
                  <span className="w-6 text-center text-sm">{l.quantity}</span>
                  <button onClick={() => setQuantity(l.variant_id, l.quantity + 1)} className="h-7 w-7 rounded-full border border-[var(--tg-hint-color)]/30">+</button>
                </div>
                <span className="text-sm font-medium">{formatUzs(l.price * l.quantity, locale)}</span>
              </div>
            </div>
            <button onClick={() => remove(l.variant_id)} aria-label={t('remove')} className="self-start text-[var(--tg-hint-color)]">✕</button>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between border-t border-[var(--tg-hint-color)]/15 pt-3">
        <span className="text-sm text-[var(--tg-hint-color)]">{t('total')}</span>
        <span className="font-serif text-2xl">{formatUzs(total, locale)}</span>
      </div>

      <TgMainButton text={`${t('checkout')} · ${formatUzs(total, locale)}`} onClick={() => router.push(`/${locale}/tg/checkout`)} />
    </div>
  );
}
