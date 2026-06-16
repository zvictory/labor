import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Heart, Search, ShoppingBag, User } from 'lucide-react';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { CartCountBadge } from '@/components/cart/cart-count-badge';

// Site chrome — Labor wordmark in font-display, primary nav, locale switcher and
// the search/account/wishlist/cart icon rail. Ported from apps/web. Server-safe:
// useTranslations works in RSC under NextIntlClientProvider; only LocaleSwitcher
// is a client island. All links are locale-prefixed.
export function SiteHeader({ locale }: { locale: string }) {
  const t = useTranslations('nav');
  const b = useTranslations('brand');
  const href = (path: string) => `/${locale}${path}`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container flex h-20 items-center justify-between gap-6 transition-all duration-300 md:h-24">
        <Link
          href={href('')}
          className="flex select-none items-baseline gap-2 transition-opacity hover:opacity-90"
        >
          <span className="py-2 font-display text-5xl leading-none tracking-normal text-ink transition-colors hover:text-brass dark:text-bone md:text-6xl lg:text-7xl">
            {b('name')}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium uppercase tracking-wider md:flex">
          <Link href={href('/catalog')} className="hover:text-brass">
            {t('shop')}
          </Link>
          <Link href={href('/brands')} className="hover:text-brass">
            {t('brands')}
          </Link>
          <Link href={href('/notes')} className="hover:text-brass">
            {t('notes')}
          </Link>
          <Link href={href('/perfumers')} className="hover:text-brass">
            {t('perfumers')}
          </Link>
          <Link href={href('/find-your-perfume')} className="hover:text-brass">
            {t('finder')}
          </Link>
          <Link href={href('/campaigns')} className="hover:text-brass">
            {t('campaigns')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link href={href('/search')} aria-label={t('search')} className="p-2 hover:text-brass">
            <Search className="h-5 w-5" />
          </Link>
          <Link href={href('/account')} aria-label={t('account')} className="p-2 hover:text-brass">
            <User className="h-5 w-5" />
          </Link>
          <Link href={href('/wishlist')} aria-label={t('wishlist')} className="p-2 hover:text-brass">
            <Heart className="h-5 w-5" />
          </Link>
          <Link
            href={href('/cart')}
            aria-label={t('cart')}
            className="relative p-2 hover:text-brass"
          >
            <ShoppingBag className="h-5 w-5" />
            <CartCountBadge />
          </Link>
        </div>
      </div>
    </header>
  );
}
