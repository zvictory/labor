import Link from 'next/link';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { cartItemsTotal, readCart } from '@/lib/cart/cart';
import { formatUzs } from '@/lib/money';
import { freeDeliveryThreshold } from '@/lib/delivery/free-delivery';
import { CartLineControls } from '@/components/cart/cart-line-controls';
import { TELEGRAM_URL } from '@/lib/telegram';

type Props = { params: Promise<{ locale: Locale }> };

const primaryClass =
  'bg-foreground text-background hover:opacity-85 inline-flex min-h-12 items-center justify-center px-6 text-sm font-semibold transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4';

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [cart, t, tpdp] = await Promise.all([
    readCart(locale),
    getTranslations('cart'),
    getTranslations('pdp'),
  ]);
  const freeFrom = freeDeliveryThreshold();
  const itemsTotal = cartItemsTotal(cart);
  const catalogHref = `/${locale}/catalog`;
  const hasItems = cart.items.length > 0;

  return (
    <div className="container mx-auto max-w-7xl py-7 md:py-12">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 md:mb-10">
        <div className="space-y-1">
          <h1 className="page-title">{t('title')}</h1>
          {hasItems ? (
            <p className="text-muted-foreground font-mono text-xs" aria-live="polite">
              {t('itemCount', { count: cart.itemCount })}
            </p>
          ) : null}
        </div>
        {hasItems ? (
          <Link
            href={catalogHref}
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            {t('continueShopping')}
          </Link>
        ) : null}
      </header>

      {hasItems ? (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:gap-12">
          <ul className="border-border divide-border min-w-0 divide-y border-y">
            {cart.items.map((line) => {
              const display = line.display;
              const name = display?.name ?? line.name;
              const productPath = `/${locale}/product/${display?.productSlug ?? line.slug}`;
              const href = display?.selectedMl
                ? `${productPath}?size=${display.selectedMl}`
                : productPath;
              const measure = display?.size;
              const meta = [
                line.isSample ? t('sample') : display?.concentration?.toUpperCase(),
                measure
                  ? tpdp(measure.unit === 'g' ? 'packageGrams' : 'packageMl', {
                      amount: measure.amount,
                    })
                  : undefined,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <li
                  key={line.id}
                  className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 py-5 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:gap-x-5 sm:py-6"
                >
                  <div className="border-border bg-muted/30 relative row-span-2 aspect-square overflow-hidden border sm:row-span-1">
                    {line.image ? (
                      <Image
                        src={line.image}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 88px, 72px"
                        className="object-contain p-2 mix-blend-multiply dark:mix-blend-normal"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground absolute inset-0 grid place-items-center text-xl"
                      >
                        —
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="space-y-0.5">
                      {line.brand ? <p className="eyebrow break-words">{line.brand}</p> : null}
                      <Link
                        href={href}
                        className="block text-base leading-snug font-semibold break-words hover:underline hover:underline-offset-4"
                      >
                        {name}
                      </Link>
                      {meta ? (
                        <p className="text-muted-foreground font-mono text-xs">{meta}</p>
                      ) : null}
                    </div>
                    <CartLineControls
                      itemId={line.id}
                      quantity={line.quantity}
                      locale={locale}
                      itemLabel={[name, meta].filter(Boolean).join(' · ')}
                    />
                  </div>
                  <p className="col-start-2 font-mono text-sm font-semibold sm:col-start-3 sm:min-w-30 sm:text-right sm:text-base">
                    {formatUzs(line.lineTotal, locale)}
                  </p>
                </li>
              );
            })}
          </ul>

          <aside
            className="border-border h-fit space-y-4 border p-5 sm:p-6 lg:sticky lg:top-24"
            aria-labelledby="cart-summary"
          >
            <h2 id="cart-summary" className="section-title">
              {t('summaryTitle')}
            </h2>
            <dl aria-live="polite" className="space-y-2">
              {cart.setDiscount > 0 ? (
                <>
                  <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                    <dt className="text-muted-foreground">{t('subtotal')}</dt>
                    <dd className="font-mono">{formatUzs(cart.subtotal, locale)}</dd>
                  </div>
                  {cart.sets.map((set) => (
                    <div key={set.slug} className="flex flex-wrap justify-between gap-x-3 text-sm">
                      <dt className="text-muted-foreground">
                        {t('set', { title: set.title })}
                        {set.count > 1 ? ` × ${set.count}` : ''}
                      </dt>
                      <dd className="font-mono">−{formatUzs(set.saving, locale)}</dd>
                    </div>
                  ))}
                </>
              ) : null}
              <div className="border-border flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t pt-4">
                <dt className="text-sm font-medium">{t('productsTotal')}</dt>
                <dd className="font-mono text-lg font-semibold">{formatUzs(itemsTotal, locale)}</dd>
              </div>
            </dl>
            <div className="text-muted-foreground space-y-1 text-xs leading-relaxed">
              <p>{t('shippingAtCheckout')}</p>
              {freeFrom !== null ? (
                <p>
                  {itemsTotal >= freeFrom
                    ? t('deliveryThresholdReached')
                    : t('freeDeliveryLeft', { amount: formatUzs(freeFrom - itemsTotal, locale) })}
                </p>
              ) : null}
            </div>
            <Link href={`/${locale}/checkout`} className={`${primaryClass} w-full`}>
              {t('proceed')}
            </Link>
            <a
              href={TELEGRAM_URL}
              className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-xs underline underline-offset-4"
            >
              {t('telegramHelp')}
            </a>
          </aside>
        </div>
      ) : (
        <div className="border-border flex flex-col items-start gap-5 border-y py-10 md:py-14">
          <p className="body-copy text-muted-foreground">{t('empty')}</p>
          <Link href={catalogHref} className={primaryClass}>
            {t('emptyCta')}
          </Link>
        </div>
      )}
    </div>
  );
}
