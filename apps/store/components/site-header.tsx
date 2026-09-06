import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ShoppingBag } from 'lucide-react';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { CartCountBadge } from '@/components/cart/cart-count-badge';

// Site chrome — Labor wordmark in font-display, primary catalog nav, and cart.
// Ported from apps/web. Server-safe: useTranslations works in RSC under
// NextIntlClientProvider. All links are locale-prefixed.
export function SiteHeader({ locale }: { locale: string }) {
  const t = useTranslations('nav');
  const b = useTranslations('brand');
  const href = (path: string) => `/${locale}${path}`;

  // Solid, not frosted. A translucent blurred bar is the one texture the shop
  // has nowhere — the island is a single opaque surface, and the header is the
  // screen's version of it. The hairline does the separating.
  return (
    <header className="border-border bg-background sticky top-0 z-40 border-b">
      <div className="container flex h-20 items-center justify-between gap-6 transition-all duration-300 md:h-24">
        <Link
          href={href('')}
          className="flex items-baseline gap-2 transition-opacity select-none hover:opacity-90"
        >
          <span className="font-logo text-ink hover:text-ink-muted dark:text-bone py-2 text-5xl leading-none tracking-normal transition-colors md:text-6xl lg:text-7xl">
            {b('name')}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium tracking-wider uppercase md:flex">
          <Link href={href('/catalog')} className="hover:underline hover:underline-offset-4">
            {t('shop')}
          </Link>
          <Link href={href('/brands')} className="hover:underline hover:underline-offset-4">
            {t('brands')}
          </Link>
          <Link href={href('/notes')} className="hover:underline hover:underline-offset-4">
            {t('notes')}
          </Link>
          <Link href={href('/perfumers')} className="hover:underline hover:underline-offset-4">
            {t('perfumers')}
          </Link>
          {/* 450 lines of working guided search that nothing linked to. */}
          <Link
            href={href('/find-your-perfume')}
            className="hover:underline hover:underline-offset-4"
          >
            {t('finder')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link
            href={href('/cart')}
            aria-label={t('cart')}
            className="relative p-2 hover:underline hover:underline-offset-4"
          >
            <ShoppingBag className="h-5 w-5" />
            <CartCountBadge />
          </Link>
        </div>
      </div>
    </header>
  );
}
