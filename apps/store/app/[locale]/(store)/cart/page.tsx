import Link from 'next/link';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { readCart } from '@/lib/cart/cart';
import { formatUzs } from '@/lib/money';
import { CartLineControls } from '@/components/cart/cart-line-controls';

type Props = { params: Promise<{ locale: Locale }> };

type Lang = 'en' | 'ru' | 'uz';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'laborparfum_bot';
const TELEGRAM_URL = `https://t.me/${botUsername}`;
const ORDER_COPY: Record<Lang, string> = {
  ru: 'Заказать в Telegram',
  en: 'Order on Telegram',
  uz: 'Telegramda buyurtma',
};
const SAMPLE_COPY: Record<Lang, string> = {
  ru: 'Пробник',
  en: 'Sample',
  uz: 'Namuna',
};

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cart = await readCart(locale);
  const t = await getTranslations('cart');
  const lang = toLang(locale);

  return (
    <div className="container py-10 md:py-16">
      <h1 className="font-display text-ink dark:text-bone mb-8 text-4xl md:text-5xl">
        {t('title')}
      </h1>

      {cart.items.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-10">
          <p className="text-ink-muted text-lg dark:text-stone-400">{t('empty')}</p>
          <Link
            href={`/${locale}/catalog`}
            className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-12 items-center justify-center px-7 text-xs font-semibold tracking-widest uppercase transition-colors"
          >
            {t('emptyCta')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
          {/* Line items */}
          <ul className="divide-border border-border divide-y border-y">
            {cart.items.map((line) => (
              <li key={line.id} className="flex gap-4 py-6">
                <Link
                  href={`/${locale}/product/${line.slug}`}
                  className="relative h-28 w-24 shrink-0 overflow-hidden rounded bg-stone-50"
                >
                  {line.image && (
                    <Image
                      src={line.image}
                      alt={line.name}
                      fill
                      sizes="96px"
                      className="object-contain p-2"
                    />
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {line.brand && (
                        <p className="text-xs tracking-widest text-stone-500 uppercase">
                          {line.brand}
                        </p>
                      )}
                      <Link
                        href={`/${locale}/product/${line.slug}`}
                        className="text-ink dark:text-bone text-base hover:underline hover:underline-offset-4"
                      >
                        {line.name}
                      </Link>
                      {line.isSample && (
                        <span className="text-micro ml-2 inline-block rounded bg-stone-100 px-1.5 py-0.5 tracking-wide text-stone-600 uppercase dark:bg-stone-800 dark:text-stone-300">
                          {SAMPLE_COPY[lang]}
                        </span>
                      )}
                      <p className="text-ink-muted mt-1 text-sm dark:text-stone-400">
                        {formatUzs(line.unitPrice, locale)}
                      </p>
                    </div>
                    <span className="text-ink dark:text-bone text-base font-medium whitespace-nowrap">
                      {formatUzs(line.lineTotal, locale)}
                    </span>
                  </div>
                  <div className="mt-auto">
                    <CartLineControls
                      itemId={line.id}
                      quantity={line.quantity}
                      locale={locale}
                      removeLabel={t('remove')}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Summary */}
          <aside className="border-border h-fit space-y-5 rounded-lg border p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted dark:text-stone-400">{t('subtotal')}</span>
              <span className="text-ink dark:text-bone font-medium">
                {formatUzs(cart.subtotal, locale)}
              </span>
            </div>
            <p className="text-xs text-stone-400">{/* delivery added at checkout */}</p>
            <Link
              href={`/${locale}/checkout`}
              className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-12 w-full items-center justify-center text-xs font-semibold tracking-widest uppercase transition-colors"
            >
              {t('proceed')}
            </Link>
            <a
              href={TELEGRAM_URL}
              className="border-foreground text-foreground hover:bg-foreground hover:text-background inline-flex h-12 w-full items-center justify-center gap-2 border text-xs font-semibold tracking-[0.18em] uppercase transition-colors"
            >
              {ORDER_COPY[lang]}
            </a>
          </aside>
        </div>
      )}
    </div>
  );
}
