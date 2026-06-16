'use client';

// Checkout client island. Controlled state for contact, address (region→district
// dependent selects), delivery method (filtered by region), and payment choice.
// The order summary (cart lines) is passed in pre-rendered from the RSC so this
// component owns only the interactive bits. On submit it calls the server action;
// success redirects server-side, failures surface inline.

import { useMemo, useState, useTransition } from 'react';

import { UZ_REGIONS } from '@/lib/delivery/uz-regions';
import { availableMethodsForRegion } from '@/lib/delivery/methods';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { formatUzs } from '@/lib/money';
import type { Locale } from '@/lib/catalog/locale';
import {
  placeOrderAction,
  type PaymentChoice,
  type PlaceOrderInput,
} from '@/app/[locale]/(store)/checkout/actions';

export interface CheckoutCopy {
  contact: string;
  name: string;
  phone: string;
  address: string;
  region: string;
  district: string;
  street: string;
  streetPlaceholder: string;
  delivery: string;
  payment: string;
  payme: string;
  click: string;
  cod: string;
  deliveryFeeLabel: string;
  free: string;
  totalLabel: string;
  submit: string;
  submitting: string;
  selectRegion: string;
  selectDistrict: string;
  errors: Record<string, string>;
}

interface Props {
  locale: Locale;
  subtotal: number;
  copy: CheckoutCopy;
}

const PAYMENT_OPTIONS: { id: PaymentChoice; key: 'payme' | 'click' | 'cod' }[] = [
  { id: 'payme', key: 'payme' },
  { id: 'click', key: 'click' },
  { id: 'cod', key: 'cod' },
];

export function CheckoutForm({ locale, subtotal, copy }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [regionName, setRegionName] = useState('');
  const [district, setDistrict] = useState('');
  const [street, setStreet] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [payment, setPayment] = useState<PaymentChoice>('payme');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Region name stored as the locale-appropriate label so it round-trips through
  // findRegion() server-side (which matches uz OR ru names case-insensitively).
  const region = useMemo(
    () => UZ_REGIONS.find((r) => (locale === 'ru' ? r.name_ru : r.name_uz) === regionName),
    [regionName, locale],
  );

  const districts = region?.districts ?? [];
  const methods = useMemo(
    () => availableMethodsForRegion(regionName || null),
    [regionName],
  );

  const selectedMethod = methods.find((m) => m.id === deliveryMethod);
  const deliveryFee = selectedMethod?.baseFee ?? 0;
  const total = subtotal + deliveryFee;

  const regionLabel = (r: (typeof UZ_REGIONS)[number]) =>
    locale === 'ru' ? r.name_ru : r.name_uz;
  const districtLabel = (d: { name_uz: string; name_ru: string }) =>
    locale === 'ru' ? d.name_ru : d.name_uz;

  function onRegionChange(value: string) {
    setRegionName(value);
    setDistrict('');
    setDeliveryMethod('');
  }

  const pickupOnly = deliveryMethod === 'pickup';
  const canSubmit =
    name.trim().length > 0 &&
    phone.trim().length >= 5 &&
    regionName.length > 0 &&
    district.length > 0 &&
    deliveryMethod.length > 0 &&
    (pickupOnly || street.trim().length > 0);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;

    const input: PlaceOrderInput = {
      locale,
      name: name.trim(),
      phone: phone.trim(),
      region: regionName,
      district,
      address: street.trim(),
      deliveryMethod,
      payment,
    };

    startTransition(async () => {
      const result = await placeOrderAction(input);
      // Success redirects server-side and never returns; only failures land here.
      if (result && result.ok === false) {
        setError(copy.errors[result.error] ?? copy.errors.unexpected ?? result.error);
      }
    });
  }

  const fieldCls =
    'h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-ink ' +
    'outline-none transition-colors focus:border-brass dark:bg-ink/40 dark:text-bone';
  const labelCls =
    'mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted dark:text-stone-400';
  const sectionTitleCls =
    'text-[10px] font-bold uppercase tracking-[0.3em] text-brass';

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      {/* Contact */}
      <section className="space-y-4">
        <h2 className={sectionTitleCls}>{copy.contact}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="co-name" className={labelCls}>
              {copy.name}
            </label>
            <input
              id="co-name"
              className={fieldCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label htmlFor="co-phone" className={labelCls}>
              {copy.phone}
            </label>
            <input
              id="co-phone"
              className={fieldCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder="+998 90 123 45 67"
              required
            />
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="space-y-4">
        <h2 className={sectionTitleCls}>{copy.address}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="co-region" className={labelCls}>
              {copy.region}
            </label>
            <select
              id="co-region"
              className={fieldCls}
              value={regionName}
              onChange={(e) => onRegionChange(e.target.value)}
              required
            >
              <option value="">{copy.selectRegion}</option>
              {UZ_REGIONS.map((r) => (
                <option key={r.name_uz} value={regionLabel(r)}>
                  {regionLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="co-district" className={labelCls}>
              {copy.district}
            </label>
            <select
              id="co-district"
              className={fieldCls}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!region}
              required
            >
              <option value="">{copy.selectDistrict}</option>
              {districts.map((d) => (
                <option key={d.name_uz} value={districtLabel(d)}>
                  {districtLabel(d)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="co-street" className={labelCls}>
            {copy.street}
          </label>
          <input
            id="co-street"
            className={fieldCls}
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder={copy.streetPlaceholder}
            autoComplete="street-address"
            // street is optional only for pickup
            required={!pickupOnly}
            disabled={pickupOnly}
          />
        </div>
      </section>

      {/* Delivery method */}
      <section className="space-y-4">
        <h2 className={sectionTitleCls}>{copy.delivery}</h2>
        <div className="space-y-3">
          {methods.map((m) => {
            const checked = deliveryMethod === m.id;
            return (
              <label
                key={m.id}
                className={
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ' +
                  (checked
                    ? 'border-brass bg-brass/5'
                    : 'border-border hover:border-brass/50')
                }
              >
                <input
                  type="radio"
                  name="deliveryMethod"
                  className="mt-1 accent-brass"
                  value={m.id}
                  checked={checked}
                  onChange={() => setDeliveryMethod(m.id)}
                />
                <span className="flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-ink dark:text-bone">
                      {resolveLocaleText(m.label, locale)}
                    </span>
                    <span className="text-sm font-medium text-ink dark:text-bone">
                      {m.baseFee > 0 ? formatUzs(m.baseFee, locale) : copy.free}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted dark:text-stone-400">
                    {resolveLocaleText(m.description, locale)} · {resolveLocaleText(m.eta, locale)}
                  </span>
                </span>
              </label>
            );
          })}
          {regionName.length === 0 && (
            <p className="text-xs text-ink-muted dark:text-stone-400">{copy.selectRegion}</p>
          )}
        </div>
      </section>

      {/* Payment */}
      <section className="space-y-4">
        <h2 className={sectionTitleCls}>{copy.payment}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {PAYMENT_OPTIONS.map((opt) => {
            const checked = payment === opt.id;
            return (
              <label
                key={opt.id}
                className={
                  'flex cursor-pointer items-center justify-center rounded-lg border p-4 text-sm font-medium transition-colors ' +
                  (checked
                    ? 'border-brass bg-brass/5 text-ink dark:text-bone'
                    : 'border-border text-ink-muted hover:border-brass/50 dark:text-stone-400')
                }
              >
                <input
                  type="radio"
                  name="payment"
                  className="sr-only"
                  value={opt.id}
                  checked={checked}
                  onChange={() => setPayment(opt.id)}
                />
                {copy[opt.key]}
              </label>
            );
          })}
        </div>
      </section>

      {/* Totals */}
      <section className="space-y-2 border-t border-border pt-6">
        <div className="flex items-center justify-between text-sm text-ink-muted dark:text-stone-400">
          <span>{copy.deliveryFeeLabel}</span>
          <span>{deliveryFee > 0 ? formatUzs(deliveryFee, locale) : copy.free}</span>
        </div>
        <div className="flex items-center justify-between text-lg font-medium text-ink dark:text-bone">
          <span>{copy.totalLabel}</span>
          <span>{formatUzs(total, locale)}</span>
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit || isPending}
        className="inline-flex h-12 w-full items-center justify-center bg-ink px-7 text-xs font-semibold uppercase tracking-widest text-bone transition-colors hover:bg-brass disabled:cursor-not-allowed disabled:opacity-50 dark:bg-bone dark:text-ink"
      >
        {isPending ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
