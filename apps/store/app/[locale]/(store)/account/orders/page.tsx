import Link from 'next/link';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { formatUzs } from '@/lib/money';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getUserOrders,
  type OrderStatus,
  type OrderPaymentStatus,
} from '@/lib/orders/queries';

type Props = { params: Promise<{ locale: Locale }> };

type Lang = 'ru' | 'uz' | 'en';
const toLang = (locale: string): Lang =>
  locale === 'uz' || locale === 'en' ? locale : 'ru';

const COPY: Record<
  Lang,
  {
    title: string;
    empty: string;
    browse: string;
    orderNo: string;
    total: string;
    back: string;
    statusLabel: Record<OrderStatus, string>;
    paymentLabel: Record<OrderPaymentStatus, string>;
  }
> = {
  ru: {
    title: 'Мои заказы',
    empty: 'У вас пока нет заказов.',
    browse: 'Перейти в каталог',
    orderNo: 'Заказ',
    total: 'Итого',
    back: 'Назад в кабинет',
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
    title: 'Buyurtmalarim',
    empty: 'Sizda hali buyurtmalar yo‘q.',
    browse: 'Katalogga o‘tish',
    orderNo: 'Buyurtma',
    total: 'Jami',
    back: 'Kabinetga qaytish',
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
    title: 'My orders',
    empty: 'You have no orders yet.',
    browse: 'Browse the catalog',
    orderNo: 'Order',
    total: 'Total',
    back: 'Back to account',
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

export default async function AccountOrdersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/account/login`);
  }

  const orders = await getUserOrders(user.id);
  const copy = COPY[toLang(locale)];

  return (
    <div className="container max-w-2xl py-12 md:py-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
          {copy.title}
        </h1>
        <Link
          href={`/${locale}/account`}
          className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted hover:text-brass dark:text-stone-400"
        >
          {copy.back}
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border p-10 text-center">
          <p className="text-sm text-ink-muted dark:text-stone-400">{copy.empty}</p>
          <Link
            href={`/${locale}/catalog`}
            className="mt-4 inline-flex h-11 items-center justify-center bg-ink px-6 text-xs font-semibold uppercase tracking-widest text-bone transition-colors hover:bg-brass dark:bg-bone dark:text-ink"
          >
            {copy.browse}
          </Link>
        </div>
      ) : (
        <ul className="mt-10 divide-y divide-border rounded-xl border border-border">
          {orders.map((order) => (
            <li key={order.number}>
              <Link
                href={`/${locale}/orders/${encodeURIComponent(order.number)}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-stone-50/50 dark:hover:bg-ink/30"
              >
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-ink dark:text-bone">
                    {copy.orderNo} {order.number}
                  </span>
                  <span className="block text-xs text-ink-muted dark:text-stone-400">
                    {copy.statusLabel[order.status]} · {copy.paymentLabel[order.paymentStatus]} ·{' '}
                    {order.createdAt.toLocaleDateString(
                      locale === 'uz' ? 'uz-Latn' : locale,
                    )}
                  </span>
                </span>
                <span className="whitespace-nowrap text-sm font-medium text-ink dark:text-bone">
                  {formatUzs(order.total, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
