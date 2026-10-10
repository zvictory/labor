'use client';

// Checkout client island. Controlled state for contact, address (region→district
// dependent selects), delivery method (filtered by region), and payment choice.
// The order summary lives here too, next to that state: its delivery, discount
// and total follow what the customer picks. On submit it calls the server
// action; success redirects server-side, failures surface inline.

import Image from 'next/image';
import { useMemo, useRef, useState, useTransition } from 'react';

import { UZ_REGIONS } from '@/lib/delivery/uz-regions';
import { availableMethodsForRegion } from '@/lib/delivery/methods';
import {
  deliveryFee as feeAfterThreshold,
  qualifiesForFreeDelivery,
} from '@/lib/delivery/free-delivery';
import { DeliveryQuote } from '@/components/checkout/delivery-quote';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { missingCheckoutFields, type CheckoutField } from '@/lib/checkout/missing-fields';
import { formatUzs } from '@/lib/money';
import { useHydrated } from '@/lib/use-hydrated';
import type { CartLineDTO } from '@/lib/cart/cart';
import type { Locale } from '@/lib/catalog/locale';
import {
  placeOrderAction,
  previewPromoAction,
  type PaymentChoice,
  type PlaceOrderInput,
} from '@/app/[locale]/(store)/checkout/actions';

export interface CheckoutCopy {
  summary: string;
  sample: string;
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
  /** Shown in place of a delivery price until a method is chosen. */
  deliveryPending: string;
  free: string;
  totalLabel: string;
  submit: string;
  submitting: string;
  /** Followed by the names of the fields still to fill. */
  missingPrefix: string;
  selectRegion: string;
  selectDistrict: string;
  promo: string;
  promoPlaceholder: string;
  promoApply: string;
  /** `{code}` is replaced with the applied code. */
  promoApplied: string;
  promoRemove: string;
  subtotalLabel: string;
  discountLabel: string;
  /** `{amount}` is replaced with what is left to reach free delivery. */
  freeDeliveryLeft: string;
  freeDeliveryReached: string;
  errors: Record<string, string>;
}

interface Props {
  locale: Locale;
  items: CartLineDTO[];
  subtotal: number;
  copy: CheckoutCopy;
  /** Items total from which the Tashkent courier is free; null when off. */
  freeDeliveryFrom: number | null;
}

const PAYMENT_OPTIONS: { id: PaymentChoice; key: 'payme' | 'click' | 'cod' }[] = [
  { id: 'payme', key: 'payme' },
  { id: 'click', key: 'click' },
  { id: 'cod', key: 'cod' },
];

// Where the cursor goes when a field is what stops the order.
const FOCUS_TARGET: Record<CheckoutField, string> = {
  name: '#co-name',
  phone: '#co-phone',
  region: '#co-region',
  district: '#co-district',
  address: '#co-street',
  delivery: 'input[name="deliveryMethod"]',
};

export function CheckoutForm({ locale, items, subtotal, copy, freeDeliveryFrom }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const hydrated = useHydrated();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [regionName, setRegionName] = useState('');
  const [district, setDistrict] = useState('');
  const [street, setStreet] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [payment, setPayment] = useState<PaymentChoice>('payme');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isPromoPending, startPromoTransition] = useTransition();
  // A field's error shows once the customer has left it, or has tried to send
  // the order; not while they are still on their way to it.
  const [touched, setTouched] = useState<ReadonlySet<CheckoutField>>(new Set());
  const [attempted, setAttempted] = useState(false);

  // Region name stored as the locale-appropriate label so it round-trips through
  // findRegion() server-side (which matches uz OR ru names case-insensitively).
  const region = useMemo(
    () => UZ_REGIONS.find((r) => (locale === 'ru' ? r.name_ru : r.name_uz) === regionName),
    [regionName, locale],
  );

  const districts = region?.districts ?? [];
  const methods = useMemo(() => availableMethodsForRegion(regionName || null), [regionName]);

  // Same arithmetic as lib/orders/create.ts: the discount comes off the items,
  // and the free-delivery threshold is measured on what is left.
  const discount = promo?.discount ?? 0;
  const itemsTotal = subtotal - discount;
  const feeFor = (m: { id: string; baseFee: number }) =>
    feeAfterThreshold(m, itemsTotal, freeDeliveryFrom);
  const selectedMethod = methods.find((m) => m.id === deliveryMethod);
  const deliveryFee = selectedMethod ? feeFor(selectedMethod) : 0;
  const total = itemsTotal + deliveryFee;
  const showFreeHint =
    freeDeliveryFrom !== null &&
    (deliveryMethod === '' || qualifiesForFreeDelivery(deliveryMethod));

  function applyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    setPromoError(null);
    startPromoTransition(async () => {
      const result = await previewPromoAction(code, locale);
      if (result.ok) {
        setPromo({ code: result.code, discount: result.discount });
        setPromoInput('');
      } else {
        setPromo(null);
        setPromoError(copy.errors[result.error] ?? copy.errors.unexpected ?? result.error);
      }
    });
  }

  const regionLabel = (r: (typeof UZ_REGIONS)[number]) => (locale === 'ru' ? r.name_ru : r.name_uz);
  const districtLabel = (d: { name_uz: string; name_ru: string }) =>
    locale === 'ru' ? d.name_ru : d.name_uz;

  function onRegionChange(value: string) {
    setRegionName(value);
    setDistrict('');
    setDeliveryMethod('');
  }

  const pickupOnly = deliveryMethod === 'pickup';
  const missing = missingCheckoutFields({
    name,
    phone,
    region: regionName,
    district,
    address: street,
    deliveryMethod,
  });
  const showError = (field: CheckoutField) =>
    missing.includes(field) && (attempted || touched.has(field));
  const touch = (field: CheckoutField) =>
    setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
  const invalidProps = (field: CheckoutField) => ({
    'aria-invalid': showError(field) || undefined,
    'aria-describedby': showError(field) ? `co-${field}-error` : undefined,
    onBlur: () => touch(field),
  });
  const fieldError = (field: CheckoutField) =>
    showError(field) && (
      <p id={`co-${field}-error`} className="mt-1.5 text-xs text-red-700 dark:text-red-400">
        {copy.errors[`${field}_required`]}
      </p>
    );

  const missingLabels: Record<CheckoutField, string> = {
    name: copy.name,
    phone: copy.phone,
    region: copy.region,
    district: copy.district,
    address: copy.address,
    delivery: copy.delivery,
  };
  const missingHint =
    missing.length > 0
      ? `${copy.missingPrefix} ${missing
          .map((field) => missingLabels[field].toLocaleLowerCase(locale))
          .join(', ')}`
      : '';

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const [firstMissing] = missing;
    if (firstMissing) {
      setAttempted(true);
      const target = formRef.current?.querySelector<HTMLElement>(FOCUS_TARGET[firstMissing]);
      target?.scrollIntoView({ block: 'center' });
      target?.focus({ preventScroll: true });
      return;
    }

    const input: PlaceOrderInput = {
      locale,
      name: name.trim(),
      phone: phone.trim(),
      region: regionName,
      district,
      address: street.trim(),
      deliveryMethod,
      payment,
      promoCode: promo?.code,
    };

    startTransition(async () => {
      const result = await placeOrderAction(input);
      // Success redirects server-side and never returns; only failures land here.
      if (result && result.ok === false) {
        setError(copy.errors[result.error] ?? copy.errors.unexpected ?? result.error);
      }
    });
  }

  const fieldBaseCls =
    'h-11 w-full rounded-md border bg-white px-3 text-sm text-ink ' +
    'transition-colors dark:bg-ink/40 dark:text-bone ';
  const fieldCls = (field?: CheckoutField) =>
    fieldBaseCls +
    (field && showError(field) ? 'border-red-600' : 'border-border focus:border-foreground');
  const labelCls =
    'mb-1.5 block text-label font-semibold uppercase tracking-widest text-ink-muted dark:text-stone-400';
  const sectionTitleCls = 'text-muted-foreground font-mono text-micro tracking-[0.28em] uppercase';
  const cardCls = 'border-border dark:bg-ink/30 rounded-xl border bg-stone-50/50 p-6';

  return (
    // noValidate: the fields keep `required`, but the browser's own bubbles (in
    // the browser's language) would stop the submit before onSubmit runs.
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-12 lg:grid lg:grid-cols-[1fr_minmax(320px,420px)] lg:items-start lg:gap-16"
    >
      <div className="order-2 space-y-10 lg:order-1">
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
                className={fieldCls('name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                {...invalidProps('name')}
              />
              {fieldError('name')}
            </div>
            <div>
              <label htmlFor="co-phone" className={labelCls}>
                {copy.phone}
              </label>
              <input
                id="co-phone"
                className={fieldCls('phone')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+998 90 123 45 67"
                required
                {...invalidProps('phone')}
              />
              {fieldError('phone')}
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
                className={fieldCls('region')}
                value={regionName}
                onChange={(e) => onRegionChange(e.target.value)}
                required
                {...invalidProps('region')}
              >
                <option value="">{copy.selectRegion}</option>
                {UZ_REGIONS.map((r) => (
                  <option key={r.name_uz} value={regionLabel(r)}>
                    {regionLabel(r)}
                  </option>
                ))}
              </select>
              {fieldError('region')}
            </div>
            <div>
              <label htmlFor="co-district" className={labelCls}>
                {copy.district}
              </label>
              <select
                id="co-district"
                className={fieldCls('district')}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={!region}
                required
                {...invalidProps('district')}
              >
                <option value="">{copy.selectDistrict}</option>
                {districts.map((d) => (
                  <option key={d.name_uz} value={districtLabel(d)}>
                    {districtLabel(d)}
                  </option>
                ))}
              </select>
              {fieldError('district')}
            </div>
          </div>
          <div>
            <label htmlFor="co-street" className={labelCls}>
              {copy.street}
            </label>
            <input
              id="co-street"
              className={fieldCls('address')}
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder={copy.streetPlaceholder}
              autoComplete="street-address"
              // street is optional only for pickup
              required={!pickupOnly}
              disabled={pickupOnly}
              {...invalidProps('address')}
            />
            {fieldError('address')}
          </div>
        </section>

        {/* Delivery method */}
        <section className="space-y-4">
          <h2 id="co-delivery-title" className={sectionTitleCls}>
            {copy.delivery}
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="co-delivery-title"
            aria-describedby={showError('delivery') ? 'co-delivery-error' : undefined}
            className="space-y-3"
          >
            {methods.map((m) => {
              const checked = deliveryMethod === m.id;
              return (
                <label
                  key={m.id}
                  className={
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ' +
                    (checked ? 'border-brass bg-brass/5' : 'border-border hover:border-foreground')
                  }
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    className="accent-brass mt-1"
                    value={m.id}
                    checked={checked}
                    onChange={() => setDeliveryMethod(m.id)}
                  />
                  <span className="flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-ink dark:text-bone text-sm font-medium">
                        {resolveLocaleText(m.label, locale)}
                      </span>
                      <span className="text-ink dark:text-bone text-sm font-medium">
                        {feeFor(m) > 0 ? formatUzs(feeFor(m), locale) : copy.free}
                      </span>
                    </span>
                    <span className="text-ink-muted mt-0.5 block text-xs dark:text-stone-400">
                      {resolveLocaleText(m.description, locale)} ·{' '}
                      {resolveLocaleText(m.eta, locale)}
                    </span>
                    {/* Live courier estimate (display-only; charged fee stays
                        m.baseFee). Shown for the selected in-city courier option. */}
                    {checked && m.id === 'courier-tashkent' && (
                      <DeliveryQuote
                        locale={locale}
                        region={regionName}
                        district={district}
                        address={street}
                        method={m.id}
                        fallbackFee={m.baseFee}
                      />
                    )}
                  </span>
                </label>
              );
            })}
            {regionName.length === 0 && (
              <p className="text-ink-muted text-xs dark:text-stone-400">{copy.selectRegion}</p>
            )}
            {fieldError('delivery')}
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
                      : 'border-border text-ink-muted hover:border-foreground dark:text-stone-400')
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

        {/* Promo code */}
        <section className="space-y-3">
          <h2 className={sectionTitleCls}>{copy.promo}</h2>
          {promo ? (
            <div className="border-border flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm">
              <span className="text-ink dark:text-bone">
                {copy.promoApplied.replace('{code}', promo.code)}
              </span>
              <button
                type="button"
                onClick={() => setPromo(null)}
                className="text-ink-muted hover:text-foreground text-xs underline underline-offset-4"
              >
                {copy.promoRemove}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <label htmlFor="co-promo" className="sr-only">
                {copy.promo}
              </label>
              <input
                id="co-promo"
                className={fieldCls()}
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter applies the code instead of submitting the order.
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyPromo();
                  }
                }}
                placeholder={copy.promoPlaceholder}
                autoComplete="off"
                autoCapitalize="characters"
                aria-invalid={promoError !== null}
                aria-describedby={promoError ? 'co-promo-error' : undefined}
              />
              <button
                type="button"
                onClick={applyPromo}
                disabled={isPromoPending || promoInput.trim().length === 0}
                className="border-border text-ink hover:border-foreground dark:text-bone h-11 shrink-0 rounded-md border px-4 text-xs font-semibold tracking-widest uppercase disabled:opacity-50"
              >
                {copy.promoApply}
              </button>
            </div>
          )}
          {promoError && (
            <p id="co-promo-error" role="alert" className="text-sm text-red-700">
              {promoError}
            </p>
          )}
        </section>
      </div>

      {/* Order summary. On a phone this wrapper has no box of its own, so its two
          cards are placed by the form: the items above the fields, the totals
          and the button below them. From lg up it is one column that stays in
          view while the fields scroll. */}
      <div className="contents lg:sticky lg:top-24 lg:order-2 lg:block lg:space-y-4">
        <aside aria-labelledby="co-summary-title" className={`${cardCls} order-1 space-y-6`}>
          {/* The count says how many lines there are when the capped list below
              shows only the first few. */}
          <h2 id="co-summary-title" className={sectionTitleCls}>
            {copy.summary} · {items.reduce((sum, line) => sum + line.quantity, 0)}
          </h2>
          {/* Capped from lg up: a long cart must not push the button below the
              screen, where a sticky column would keep it out of reach. */}
          <ul className="space-y-4 lg:max-h-[max(10rem,calc(100vh_-_34rem))] lg:overflow-y-auto">
            {items.map((line) => (
              <li key={line.id} className="flex items-center gap-4 text-sm">
                <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded bg-stone-50">
                  {line.image && (
                    <Image
                      src={line.image}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain p-1"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  {line.brand && (
                    <span className="text-micro block tracking-widest text-stone-500 uppercase">
                      {line.brand}
                    </span>
                  )}
                  <span className="text-ink dark:text-bone block leading-tight">{line.name}</span>
                  <span className="text-ink-muted text-xs dark:text-stone-400">
                    {line.isSample ? `${copy.sample} · ` : ''}× {line.quantity}
                  </span>
                </span>
                <span className="text-ink dark:text-bone font-medium whitespace-nowrap">
                  {formatUzs(line.lineTotal, locale)}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <div className={`${cardCls} order-3 space-y-4`}>
          <div className="space-y-2">
            <div className="text-ink-muted flex items-center justify-between text-sm dark:text-stone-400">
              <span>{copy.subtotalLabel}</span>
              <span>{formatUzs(subtotal, locale)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm text-green-700 dark:text-green-400">
                <span>{copy.discountLabel}</span>
                <span>−{formatUzs(discount, locale)}</span>
              </div>
            )}
            <div className="text-ink-muted flex items-center justify-between text-sm dark:text-stone-400">
              <span>{copy.deliveryFeeLabel}</span>
              <span>
                {!selectedMethod
                  ? copy.deliveryPending
                  : deliveryFee > 0
                    ? formatUzs(deliveryFee, locale)
                    : copy.free}
              </span>
            </div>
            {showFreeHint && freeDeliveryFrom !== null && (
              <p className="text-ink-muted text-xs dark:text-stone-400">
                {itemsTotal >= freeDeliveryFrom
                  ? copy.freeDeliveryReached
                  : copy.freeDeliveryLeft.replace(
                      '{amount}',
                      formatUzs(freeDeliveryFrom - itemsTotal, locale),
                    )}
              </p>
            )}
          </div>
          <div className="border-border text-ink dark:text-bone flex items-center justify-between border-t pt-4 text-lg font-medium">
            <span>{copy.totalLabel}</span>
            <span>{formatUzs(total, locale)}</span>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {/* Never disabled for an unfinished form: a dead button cannot say
              what is missing. A press sends the cursor to the first gap.
              Disabled until hydrated: before that a press would send the form
              the browser's way, reload the page and wipe what was typed. */}
          <button
            type="submit"
            disabled={!hydrated || isPending}
            aria-describedby={missingHint ? 'co-missing' : undefined}
            className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-12 w-full items-center justify-center px-7 text-xs font-semibold tracking-widest uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? copy.submitting : copy.submit}
          </button>
          {missingHint && (
            <p
              id="co-missing"
              className={
                'text-xs ' +
                (attempted
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-ink-muted dark:text-stone-400')
              }
            >
              {missingHint}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
