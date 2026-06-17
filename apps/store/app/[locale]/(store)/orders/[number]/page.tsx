import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { formatUzs } from '@/lib/money';
import {
  getOrderByNumber,
  type OrderStatus,
  type OrderPaymentStatus,
} from '@/lib/orders/queries';

type Props = {
  params: Promise<{ locale: Locale; number: string }>;
};

type Lang = 'ru' | 'uz' | 'en';
const SUPPORTED: readonly Lang[] = ['ru', 'uz', 'en'];
const toLang = (locale: string): Lang =>
  (SUPPORTED as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'laborparfum_bot';
const TELEGRAM_URL = `https://t.me/${botUsername}`;

const COPY: Record<
  Lang,
  {
    thanks: string;
    orderNo: string;
    status: string;
    payment: string;
    items: string;
    delivery: string;
    contact: string;
    subtotal: string;
    deliveryFee: string;
    total: string;
    free: string;
    track: string;
    statusLabel: Record<OrderStatus, string>;
    paymentLabel: Record<OrderPaymentStatus, string>;
  }
> = {
  ru: {
    thanks: 'Спасибо за заказ!',
    orderNo: 'Номер заказа',
    status: 'Статус',
    payment: 'Оплата',
    items: 'Товары',
    delivery: 'Доставка',
    contact: 'Контакт',
    subtotal: 'Сумма',
    deliveryFee: 'Доставка',
    total: 'Итого',
    free: 'Бесплатно',
    track: 'Отслеживайте статус заказа в нашем Telegram-боте.',
    statusLabel: {
      pending: 'Ожидает',
      confirmed: 'Подтверждён',
      paid: 'Оплачен',
      shipped: 'Отправлен',
      delivered: 'Доставлен',
      canceled: 'Отменён',
    },
    paymentLabel: { unpaid: 'Не оплачен', paid: 'Оплачен', refunded: 'Возвращён' },
  },
  uz: {
    thanks: 'Buyurtmangiz uchun rahmat!',
    orderNo: 'Buyurtma raqami',
    status: 'Holat',
    payment: "To'lov",
    items: 'Mahsulotlar',
    delivery: 'Yetkazib berish',
    contact: 'Aloqa',
    subtotal: 'Summa',
    deliveryFee: 'Yetkazib berish',
    total: 'Jami',
    free: 'Bepul',
    track: "Buyurtma holatini Telegram-botimizda kuzating.",
    statusLabel: {
      pending: 'Kutilmoqda',
      confirmed: 'Tasdiqlandi',
      paid: "To'landi",
      shipped: 'Jo‘natildi',
      delivered: 'Yetkazildi',
      canceled: 'Bekor qilindi',
    },
    paymentLabel: { unpaid: "To'lanmagan", paid: "To'langan", refunded: 'Qaytarildi' },
  },
  en: {
    thanks: 'Thank you for your order!',
    orderNo: 'Order number',
    status: 'Status',
    payment: 'Payment',
    items: 'Items',
    delivery: 'Delivery',
    contact: 'Contact',
    subtotal: 'Subtotal',
    deliveryFee: 'Delivery',
    total: 'Total',
    free: 'Free',
    track: 'Track your order status in our Telegram bot.',
    statusLabel: {
      pending: 'Pending',
      confirmed: 'Confirmed',
      paid: 'Paid',
      shipped: 'Shipped',
      delivered: 'Delivered',
      canceled: 'Canceled',
    },
    paymentLabel: { unpaid: 'Unpaid', paid: 'Paid', refunded: 'Refunded' },
  },
};

export default async function OrderConfirmationPage({ params }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);

  const order = await getOrderByNumber(number, locale);
  if (!order) {
    notFound();
  }

  const copy = COPY[toLang(locale)];
  const latestPayment = order.payments[0];

  return (
    <div className="container max-w-3xl py-12 md:py-16">
      {/* Header */}
      <div className="space-y-2 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
          {copy.orderNo}: {order.number}
        </p>
        <h1 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
          {copy.thanks}
        </h1>
      </div>

      {/* Status badges */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm">
          <span className="text-ink-muted dark:text-stone-400">{copy.status}:</span>
          <span className="font-medium text-ink dark:text-bone">
            {copy.statusLabel[order.status]}
          </span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm">
          <span className="text-ink-muted dark:text-stone-400">{copy.payment}:</span>
          <span
            className={
              'font-medium ' +
              (order.paymentStatus === 'paid'
                ? 'text-green-700'
                : 'text-ink dark:text-bone')
            }
          >
            {copy.paymentLabel[order.paymentStatus]}
            {latestPayment ? ` · ${latestPayment.provider}` : ''}
          </span>
        </span>
      </div>

      {/* Items */}
      <section className="mt-12 space-y-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
          {copy.items}
        </h2>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {order.items.map((it) => (
            <li
              key={`${it.productId}-${it.isSample ? 'sample' : 'full'}`}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <Link
                href={`/${locale}/product/${it.slug}`}
                className="text-ink hover:text-brass dark:text-bone"
              >
                {it.name}
                {it.isSample ? ' · sample' : ''}
                <span className="text-ink-muted dark:text-stone-400"> × {it.quantity}</span>
              </Link>
              <span className="whitespace-nowrap font-medium text-ink dark:text-bone">
                {formatUzs(it.lineTotal, locale)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Totals */}
      <section className="mt-6 space-y-2 rounded-xl border border-border bg-stone-50/50 p-5 dark:bg-ink/30">
        <Row label={copy.subtotal} value={formatUzs(order.subtotal, locale)} />
        <Row
          label={`${copy.deliveryFee}${order.deliveryMethodLabel ? ` · ${order.deliveryMethodLabel}` : ''}`}
          value={order.deliveryFee > 0 ? formatUzs(order.deliveryFee, locale) : copy.free}
        />
        <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-medium text-ink dark:text-bone">
          <span>{copy.total}</span>
          <span>{formatUzs(order.total, locale)}</span>
        </div>
      </section>

      {/* Delivery + contact */}
      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
            {copy.delivery}
          </h3>
          <p className="text-sm text-ink dark:text-bone">
            {[order.region, order.district, order.address].filter(Boolean).join(', ')}
          </p>
          {order.deliveryMethodLabel && (
            <p className="text-xs text-ink-muted dark:text-stone-400">
              {order.deliveryMethodLabel}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
            {copy.contact}
          </h3>
          {order.phone && <p className="text-sm text-ink dark:text-bone">{order.phone}</p>}
        </div>
      </section>

      {/* Telegram tracking note */}
      <div className="mt-10 rounded-xl border border-[#229ED9]/40 bg-[#229ED9]/5 p-5 text-center">
        <p className="text-sm text-ink dark:text-bone">{copy.track}</p>
        <a
          href={TELEGRAM_URL}
          className="mt-3 inline-flex h-10 items-center justify-center gap-2 border border-[#229ED9] px-6 text-xs font-semibold uppercase tracking-widest text-[#1c7fb0] transition-colors hover:bg-[#229ED9] hover:text-white"
        >
          Telegram
        </a>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-ink-muted dark:text-stone-400">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
