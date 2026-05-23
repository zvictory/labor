'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCartStore } from '@/lib/stores/cart-store';
import { TgMainButton } from '@/components/tg/main-button';
import { TgBackButton } from '@/components/tg/back-button';
import { apiFetch, ApiError } from '@/lib/api/client';
import { formatUzs } from '@/lib/format';
import { getTelegramWebApp } from '@/lib/telegram-webapp';

type DeliveryProvider = 'yandex' | 'express24' | 'bts';
type PaymentMethod = 'click' | 'payme' | 'uzum' | 'cod';

interface DeliveryQuote {
  provider: DeliveryProvider;
  price: number;
  currency: 'UZS';
  eta_minutes?: number;
}

interface CreatedOrder {
  number: string;
  total: number;
}

const isTashkent = (city: string) => /tashkent|ташкент|toshkent/i.test(city.trim());

export default function TgCheckoutPage() {
  const t = useTranslations('tg.checkout');
  const locale = useLocale();
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const cartTotal = useCartStore((s) => s.total());
  const clear = useCartStore((s) => s.clear);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [promo, setPromo] = useState('');
  const [provider, setProvider] = useState<DeliveryProvider>('yandex');
  const [payment, setPayment] = useState<PaymentMethod>('click');
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tashkentOnly = !isTashkent(city);

  const availableProviders = useMemo<DeliveryProvider[]>(
    () => (tashkentOnly ? ['yandex', 'bts'] : ['yandex', 'express24', 'bts']),
    [tashkentOnly],
  );

  useEffect(() => {
    if (!availableProviders.includes(provider)) setProvider(availableProviders[0] ?? 'yandex');
  }, [availableProviders, provider]);

  useEffect(() => {
    if (lines.length === 0) router.replace(`/${locale}/tg/cart`);
  }, [lines.length, locale, router]);

  useEffect(() => {
    if (!city.trim() || !address.trim()) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteError(null);
    apiFetch<{ data: DeliveryQuote }>(`/storefront/delivery/${provider}/quote`, {
      method: 'POST',
      locale,
      body: {
        items: lines.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity })),
        destination: { city, address },
      },
    })
      .then((r) => {
        if (!cancelled) setQuote(r.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(err instanceof ApiError ? err.message : t('quote.error'));
      });
    return () => {
      cancelled = true;
    };
  }, [provider, city, address, lines, locale, t]);

  const shippingPrice = quote?.price ?? 0;
  const grandTotal = cartTotal + shippingPrice;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('labor-token') ?? undefined : undefined;
      const { data } = await apiFetch<{ data: CreatedOrder & { payment_redirect_url?: string } }>(
        '/storefront/checkout',
        {
          method: 'POST',
          locale,
          token,
          body: {
            line_items: lines.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity })),
            ship_address: { name, phone, city, address },
            delivery_provider: provider,
            payment_method: payment,
            promo_code: promo || undefined,
            init_data: getTelegramWebApp()?.initData,
          },
        },
      );
      clear();
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred?.('success');
      if (data.payment_redirect_url && payment !== 'cod') {
        window.location.href = data.payment_redirect_url;
        return;
      }
      router.replace(`/${locale}/tg/orders`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : t('error.generic'));
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred?.('error');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    name.trim().length > 1 &&
    /^\+?\d[\d\s-]{7,}$/.test(phone) &&
    city.trim().length > 0 &&
    address.trim().length > 2 &&
    lines.length > 0 &&
    (payment === 'cod' || quote !== null);

  return (
    <div className="space-y-4">
      <TgBackButton />
      <h1 className="font-serif text-2xl">{t('title')}</h1>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-widest text-[var(--tg-hint-color)]">{t('contact')}</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('name')}
          className="w-full rounded-md border border-[var(--tg-hint-color)]/30 bg-transparent px-3 py-2 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="+998 ..."
          className="w-full rounded-md border border-[var(--tg-hint-color)]/30 bg-transparent px-3 py-2 text-sm"
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-widest text-[var(--tg-hint-color)]">{t('address')}</h2>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t('city')}
          className="w-full rounded-md border border-[var(--tg-hint-color)]/30 bg-transparent px-3 py-2 text-sm"
        />
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t('street')}
          rows={2}
          className="w-full rounded-md border border-[var(--tg-hint-color)]/30 bg-transparent px-3 py-2 text-sm"
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-widest text-[var(--tg-hint-color)]">{t('delivery')}</h2>
        <div className="grid grid-cols-3 gap-2">
          {availableProviders.map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`rounded-md border px-3 py-2 text-xs uppercase tracking-widest ${
                provider === p
                  ? 'border-[var(--tg-button-color)] bg-[var(--tg-button-color)] text-[var(--tg-button-text-color)]'
                  : 'border-[var(--tg-hint-color)]/30'
              }`}
            >
              {t(`provider.${p}`)}
            </button>
          ))}
        </div>
        {quote && (
          <p className="text-xs text-[var(--tg-hint-color)]">
            {formatUzs(quote.price, locale)}
            {quote.eta_minutes && ` · ${t('eta', { minutes: quote.eta_minutes })}`}
          </p>
        )}
        {quoteError && <p className="text-xs text-rose-600">{quoteError}</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-widest text-[var(--tg-hint-color)]">{t('payment')}</h2>
        <div className="grid grid-cols-2 gap-2">
          {(['click', 'payme', 'uzum', 'cod'] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              onClick={() => setPayment(m)}
              className={`rounded-md border px-3 py-2 text-xs uppercase tracking-widest ${
                payment === m
                  ? 'border-[var(--tg-button-color)] bg-[var(--tg-button-color)] text-[var(--tg-button-text-color)]'
                  : 'border-[var(--tg-hint-color)]/30'
              }`}
            >
              {t(`method.${m}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-widest text-[var(--tg-hint-color)]">{t('promo')}</h2>
        <input
          value={promo}
          onChange={(e) => setPromo(e.target.value.toUpperCase())}
          placeholder={t('promoPlaceholder')}
          className="w-full rounded-md border border-[var(--tg-hint-color)]/30 bg-transparent px-3 py-2 font-mono text-sm tracking-wider"
        />
      </section>

      <section className="space-y-1 border-t border-[var(--tg-hint-color)]/15 pt-3 text-sm">
        <div className="flex justify-between text-[var(--tg-hint-color)]">
          <span>{t('subtotal')}</span>
          <span>{formatUzs(cartTotal, locale)}</span>
        </div>
        <div className="flex justify-between text-[var(--tg-hint-color)]">
          <span>{t('shipping')}</span>
          <span>{shippingPrice ? formatUzs(shippingPrice, locale) : '—'}</span>
        </div>
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-xs uppercase tracking-widest text-[var(--tg-hint-color)]">{t('total')}</span>
          <span className="font-serif text-2xl">{formatUzs(grandTotal, locale)}</span>
        </div>
      </section>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <TgMainButton
        text={
          submitting
            ? t('submitting')
            : `${t('pay')} · ${formatUzs(grandTotal, locale)}`
        }
        onClick={submit}
        disabled={!canSubmit || submitting}
        loading={submitting}
      />
    </div>
  );
}
