'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCartStore } from '@/lib/stores/cart-store';
import { useHydrated } from '@/lib/hooks/use-hydrated';
import {
  CheckoutPayloadSchema,
  createCheckout,
  type CheckoutPayload,
} from '@/lib/api/checkout';

type DeliveryMethod = CheckoutPayload['delivery_method'];
type PaymentMethod = CheckoutPayload['payment_method'];

const DELIVERY_METHODS: DeliveryMethod[] = ['yandex', 'express24', 'bts'];
const PAYMENT_METHODS: PaymentMethod[] = ['click', 'payme', 'uzum'];

const INPUT_CLS =
  'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900';
const LABEL_CLS = 'block text-xs uppercase tracking-widest text-neutral-500';
const SECTION_TITLE_CLS = 'text-xs uppercase tracking-widest text-neutral-500';

export default function CheckoutPage() {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const clear = useCartStore((s) => s.clear);
  const hydrated = useHydrated(useCartStore);

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && lines.length === 0) router.replace(`/${locale}/cart`);
  }, [hydrated, lines.length, locale, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutPayload>({
    resolver: zodResolver(CheckoutPayloadSchema),
    defaultValues: {
      name: '',
      phone: '',
      city: '',
      street: '',
      building: '',
      apt: '',
      comment: '',
      delivery_method: 'yandex',
      payment_method: 'click',
      line_items: [],
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const payload: CheckoutPayload = {
        ...values,
        line_items: lines.map((l) => ({
          variant_id: l.variant_id,
          quantity: l.quantity,
        })),
      };
      const response = await createCheckout(payload, locale);
      clear();
      window.location.href = response.payment_url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('errorGeneric');
      setSubmitError(msg);
    }
  });

  if (!hydrated) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <h1 className="font-serif text-3xl">{t('title')}</h1>

      <form onSubmit={onSubmit} className="space-y-8" noValidate>
        <section className="space-y-3">
          <h2 className={SECTION_TITLE_CLS}>{t('contact')}</h2>
          <div className="space-y-2">
            <label className={LABEL_CLS} htmlFor="name">
              {t('name')}
            </label>
            <input id="name" className={INPUT_CLS} {...register('name')} />
            {errors.name && (
              <p className="text-xs text-rose-600">{t('errorRequired')}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className={LABEL_CLS} htmlFor="phone">
              {t('phone')}
            </label>
            <input
              id="phone"
              inputMode="tel"
              placeholder="+998 ..."
              className={INPUT_CLS}
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-xs text-rose-600">{t('errorPhone')}</p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className={SECTION_TITLE_CLS}>{t('address')}</h2>
          <div className="space-y-2">
            <label className={LABEL_CLS} htmlFor="city">
              {t('city')}
            </label>
            <input id="city" className={INPUT_CLS} {...register('city')} />
            {errors.city && (
              <p className="text-xs text-rose-600">{t('errorRequired')}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className={LABEL_CLS} htmlFor="street">
              {t('street')}
            </label>
            <input id="street" className={INPUT_CLS} {...register('street')} />
            {errors.street && (
              <p className="text-xs text-rose-600">{t('errorRequired')}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className={LABEL_CLS} htmlFor="building">
                {t('building')}
              </label>
              <input
                id="building"
                className={INPUT_CLS}
                {...register('building')}
              />
              {errors.building && (
                <p className="text-xs text-rose-600">{t('errorRequired')}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className={LABEL_CLS} htmlFor="apt">
                {t('apt')}
              </label>
              <input id="apt" className={INPUT_CLS} {...register('apt')} />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className={SECTION_TITLE_CLS}>{t('delivery')}</h2>
          <div className="grid grid-cols-3 gap-2">
            {DELIVERY_METHODS.map((m) => (
              <label
                key={m}
                className="flex cursor-pointer items-center justify-center rounded-md border border-neutral-300 px-3 py-2 text-xs uppercase tracking-widest has-[input:checked]:border-neutral-900 has-[input:checked]:bg-neutral-900 has-[input:checked]:text-white"
              >
                <input
                  type="radio"
                  value={m}
                  className="sr-only"
                  {...register('delivery_method')}
                />
                {t(
                  `delivery${m.charAt(0).toUpperCase()}${m.slice(1)}` as
                    | 'deliveryYandex'
                    | 'deliveryExpress24'
                    | 'deliveryBts',
                )}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className={SECTION_TITLE_CLS}>{t('payment')}</h2>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m}
                className="flex cursor-pointer items-center justify-center rounded-md border border-neutral-300 px-3 py-2 text-xs uppercase tracking-widest has-[input:checked]:border-neutral-900 has-[input:checked]:bg-neutral-900 has-[input:checked]:text-white"
              >
                <input
                  type="radio"
                  value={m}
                  className="sr-only"
                  {...register('payment_method')}
                />
                {t(
                  `payment${m.charAt(0).toUpperCase()}${m.slice(1)}` as
                    | 'paymentClick'
                    | 'paymentPayme'
                    | 'paymentUzum',
                )}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className={SECTION_TITLE_CLS}>{t('comment')}</h2>
          <textarea
            rows={3}
            className={INPUT_CLS}
            {...register('comment')}
          />
        </section>

        {submitError && (
          <p className="text-sm text-rose-600">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || lines.length === 0}
          className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium uppercase tracking-widest text-white disabled:opacity-50"
        >
          {isSubmitting ? t('submitting') : t('submit')}
        </button>
      </form>
    </div>
  );
}
