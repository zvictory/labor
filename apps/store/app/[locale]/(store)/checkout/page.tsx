import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { formatUzs } from '@/lib/money';
import { readCart } from '@/lib/cart/cart';
import { freeDeliveryThreshold } from '@/lib/delivery/free-delivery';
import { TrackEvent } from '@/components/analytics/track-event';
import { CheckoutForm, type CheckoutCopy } from '@/components/checkout/checkout-form';

type Props = {
  params: Promise<{ locale: Locale }>;
};

type Lang = 'ru' | 'uz' | 'en';

// Inline copy (no checkout namespace in messages yet). ru-default, uz/en mirror.
// TODO(i18n): move to next-intl messages under a `checkout` namespace.
const COPY: Record<Lang, CheckoutCopy & { heading: string; summary: string; empty: string }> = {
  ru: {
    heading: 'Оформление заказа',
    summary: 'Ваш заказ',
    empty: 'Корзина пуста',
    contact: 'Контакты',
    name: 'Имя',
    phone: 'Телефон',
    address: 'Адрес доставки',
    region: 'Регион',
    district: 'Район',
    street: 'Улица, дом, квартира',
    streetPlaceholder: 'ул. Амира Темура, 1, кв. 1',
    delivery: 'Способ доставки',
    payment: 'Оплата',
    payme: 'Payme',
    click: 'Click',
    cod: 'При получении',
    deliveryFeeLabel: 'Доставка',
    free: 'Бесплатно',
    totalLabel: 'Итого',
    submit: 'Подтвердить заказ',
    submitting: 'Оформляем…',
    selectRegion: 'Выберите регион',
    selectDistrict: 'Выберите район',
    promo: 'Промокод',
    promoPlaceholder: 'Например, WELCOME10',
    promoApply: 'Применить',
    promoApplied: 'Код {code} применён',
    promoRemove: 'Убрать',
    subtotalLabel: 'Товары',
    discountLabel: 'Скидка',
    freeDeliveryLeft: 'Ещё {amount} — и доставка по Ташкенту бесплатно',
    freeDeliveryReached: 'Доставка по Ташкенту — бесплатно',
    errors: {
      promo_invalid: 'Такого промокода нет',
      promo_inactive: 'Промокод больше не действует',
      promo_not_started: 'Промокод ещё не начал действовать',
      promo_expired: 'Срок действия промокода истёк',
      promo_min_subtotal: 'Сумма заказа меньше минимальной для этого промокода',
      promo_used_up: 'Промокод уже использован максимальное число раз',
      promo_first_order_only: 'Этот промокод — только для первого заказа',
      cart_empty: 'Корзина пуста',
      address_required: 'Укажите адрес доставки',
      region_required: 'Выберите регион',
      region_unknown: 'Неизвестный регион',
      district_required: 'Выберите район',
      delivery_required: 'Выберите способ доставки',
      delivery_unknown: 'Недоступный способ доставки',
      name_required: 'Укажите имя',
      phone_required: 'Укажите телефон',
      order_already_paid: 'Заказ уже оплачен',
      unexpected: 'Что-то пошло не так. Попробуйте ещё раз.',
    },
  },
  uz: {
    heading: 'Buyurtmani rasmiylashtirish',
    summary: 'Sizning buyurtmangiz',
    empty: "Savat bo'sh",
    contact: 'Aloqa',
    name: 'Ism',
    phone: 'Telefon',
    address: 'Yetkazib berish manzili',
    region: 'Viloyat',
    district: 'Tuman',
    street: "Ko'cha, uy, xonadon",
    streetPlaceholder: 'Amir Temur ko‘chasi, 1, 1-xonadon',
    delivery: 'Yetkazib berish usuli',
    payment: "To'lov",
    payme: 'Payme',
    click: 'Click',
    cod: 'Yetkazib berishda',
    deliveryFeeLabel: 'Yetkazib berish',
    free: 'Bepul',
    totalLabel: 'Jami',
    submit: 'Buyurtmani tasdiqlash',
    submitting: 'Rasmiylashtirilmoqda…',
    selectRegion: 'Viloyatni tanlang',
    selectDistrict: 'Tumanni tanlang',
    promo: 'Promokod',
    promoPlaceholder: 'Masalan, WELCOME10',
    promoApply: 'Qoʻllash',
    promoApplied: '{code} kodi qoʻllandi',
    promoRemove: 'Olib tashlash',
    subtotalLabel: 'Mahsulotlar',
    discountLabel: 'Chegirma',
    freeDeliveryLeft: 'Yana {amount} — va Toshkent boʻylab yetkazib berish bepul',
    freeDeliveryReached: 'Toshkent boʻylab yetkazib berish — bepul',
    errors: {
      promo_invalid: 'Bunday promokod yoʻq',
      promo_inactive: 'Promokod endi amal qilmaydi',
      promo_not_started: 'Promokod hali amal qila boshlamagan',
      promo_expired: 'Promokod muddati tugagan',
      promo_min_subtotal: 'Buyurtma summasi bu promokod uchun yetarli emas',
      promo_used_up: 'Promokoddan foydalanish soni tugagan',
      promo_first_order_only: 'Bu promokod faqat birinchi buyurtma uchun',
      cart_empty: "Savat bo'sh",
      address_required: 'Manzilni kiriting',
      region_required: 'Viloyatni tanlang',
      region_unknown: "Noma'lum viloyat",
      district_required: 'Tumanni tanlang',
      delivery_required: 'Yetkazib berish usulini tanlang',
      delivery_unknown: 'Mavjud bo‘lmagan usul',
      name_required: 'Ismni kiriting',
      phone_required: 'Telefonni kiriting',
      order_already_paid: "Buyurtma allaqachon to'langan",
      unexpected: 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.',
    },
  },
  en: {
    heading: 'Checkout',
    summary: 'Your order',
    empty: 'Your cart is empty',
    contact: 'Contact',
    name: 'Name',
    phone: 'Phone',
    address: 'Delivery address',
    region: 'Region',
    district: 'District',
    street: 'Street, building, apartment',
    streetPlaceholder: '1 Amir Temur St, apt 1',
    delivery: 'Delivery method',
    payment: 'Payment',
    payme: 'Payme',
    click: 'Click',
    cod: 'Cash on delivery',
    deliveryFeeLabel: 'Delivery',
    free: 'Free',
    totalLabel: 'Total',
    submit: 'Place order',
    submitting: 'Placing…',
    selectRegion: 'Select a region',
    selectDistrict: 'Select a district',
    promo: 'Promo code',
    promoPlaceholder: 'For example, WELCOME10',
    promoApply: 'Apply',
    promoApplied: 'Code {code} applied',
    promoRemove: 'Remove',
    subtotalLabel: 'Items',
    discountLabel: 'Discount',
    freeDeliveryLeft: '{amount} more for free delivery in Tashkent',
    freeDeliveryReached: 'Delivery in Tashkent is free',
    errors: {
      promo_invalid: 'There is no such promo code',
      promo_inactive: 'This promo code is no longer active',
      promo_not_started: 'This promo code is not active yet',
      promo_expired: 'This promo code has expired',
      promo_min_subtotal: 'The order is below the minimum for this code',
      promo_used_up: 'This promo code has been used up',
      promo_first_order_only: 'This promo code is for a first order only',
      cart_empty: 'Your cart is empty',
      address_required: 'Enter a delivery address',
      region_required: 'Select a region',
      region_unknown: 'Unknown region',
      district_required: 'Select a district',
      delivery_required: 'Select a delivery method',
      delivery_unknown: 'Unavailable delivery method',
      name_required: 'Enter your name',
      phone_required: 'Enter your phone',
      order_already_paid: 'Order already paid',
      unexpected: 'Something went wrong. Please try again.',
    },
  },
};

const SUPPORTED: readonly Lang[] = ['ru', 'uz', 'en'];
const toLang = (locale: string): Lang =>
  (SUPPORTED as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cart = await readCart(locale);
  if (!cart || cart.items.length === 0) {
    redirect(`/${locale}/cart`);
  }

  const lang = toLang(locale);
  const copy = COPY[lang];

  return (
    <div className="container py-10 md:py-16">
      <TrackEvent event="begin_checkout" params={{ value: cart.subtotal, currency: 'UZS' }} />
      <h1 className="font-display text-ink dark:text-bone mb-10 text-4xl md:text-5xl">
        {copy.heading}
      </h1>

      <div className="grid gap-12 lg:grid-cols-[1fr_minmax(320px,420px)] lg:gap-16">
        {/* Form */}
        <div className="order-2 lg:order-1">
          <CheckoutForm
            locale={locale}
            subtotal={cart.subtotal}
            copy={copy}
            freeDeliveryFrom={freeDeliveryThreshold()}
          />
        </div>

        {/* Order summary */}
        <aside className="border-border dark:bg-ink/30 order-1 h-fit space-y-6 rounded-xl border bg-stone-50/50 p-6 lg:order-2">
          <h2 className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
            {copy.summary}
          </h2>
          <ul className="space-y-4">
            {cart.items.map((line) => (
              <li
                key={`${line.productId}-${line.isSample ? 'sample' : 'full'}`}
                className="flex items-start justify-between gap-4 text-sm"
              >
                <span className="text-ink dark:text-bone">
                  <span className="block leading-tight">{line.name}</span>
                  <span className="text-ink-muted text-xs dark:text-stone-400">
                    {line.isSample ? '· sample' : ''} × {line.quantity}
                  </span>
                </span>
                <span className="text-ink dark:text-bone font-medium whitespace-nowrap">
                  {formatUzs(line.unitPrice * line.quantity, locale)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-border text-ink-muted flex items-center justify-between border-t pt-4 text-sm dark:text-stone-400">
            <span>{copy.summary}</span>
            <span>{formatUzs(cart.subtotal, locale)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
