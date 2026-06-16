import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { formatUzs } from '@/lib/money';
import { getCart } from '@/lib/cart/cart';
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
    errors: {
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
    errors: {
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
    errors: {
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

  const cart = await getCart(locale);
  if (!cart || cart.items.length === 0) {
    redirect(`/${locale}/cart`);
  }

  const lang = toLang(locale);
  const copy = COPY[lang];

  return (
    <div className="container py-10 md:py-16">
      <h1 className="mb-10 font-display text-4xl text-ink dark:text-bone md:text-5xl">
        {copy.heading}
      </h1>

      <div className="grid gap-12 lg:grid-cols-[1fr_minmax(320px,420px)] lg:gap-16">
        {/* Form */}
        <div className="order-2 lg:order-1">
          <CheckoutForm locale={locale} subtotal={cart.subtotal} copy={copy} />
        </div>

        {/* Order summary */}
        <aside className="order-1 h-fit space-y-6 rounded-xl border border-border bg-stone-50/50 p-6 lg:order-2 dark:bg-ink/30">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
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
                  <span className="text-xs text-ink-muted dark:text-stone-400">
                    {line.isSample ? '· sample' : ''} × {line.quantity}
                  </span>
                </span>
                <span className="whitespace-nowrap font-medium text-ink dark:text-bone">
                  {formatUzs(line.unitPrice * line.quantity, locale)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-ink-muted dark:text-stone-400">
            <span>{copy.summary}</span>
            <span>{formatUzs(cart.subtotal, locale)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
