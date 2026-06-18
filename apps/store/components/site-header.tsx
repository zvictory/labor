'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Heart, Search, ShoppingBag, User, SlidersHorizontal } from 'lucide-react';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { CartCountBadge } from '@/components/cart/cart-count-badge';

function HeaderFilterButton() {
  const searchParams = useSearchParams();
  const activeFiltersCount = ['brand', 'note', 'family', 'gender'].filter((p) => searchParams.get(p)).length;

  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('open-catalog-filter'))}
      aria-label="Filters"
      className="flex md:hidden h-11 w-11 items-center justify-center hover:text-brass relative"
    >
      <SlidersHorizontal className="h-5 w-5" />
      {activeFiltersCount > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brass px-1 text-[9px] font-bold leading-none text-bone animate-in zoom-in-50 duration-200">
          {activeFiltersCount}
        </span>
      )}
    </button>
  );
}

export function SiteHeader({ locale }: { locale: string }) {
  const t = useTranslations('nav');
  const b = useTranslations('brand');
  const href = (path: string) => `/${locale}${path}`;

  const pathname = usePathname();
  const isCatalogPage = pathname.endsWith('/catalog');

  const handleFilterClick = () => {
    window.dispatchEvent(new CustomEvent('open-catalog-filter'));
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-6 transition-all duration-300 md:h-24">
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
        </nav>

        <div className="flex items-center gap-1.5 md:gap-3">
          <LocaleSwitcher />
          <Link href={href('/search')} aria-label={t('search')} className="hidden md:flex p-2 hover:text-brass">
            <Search className="h-5 w-5" />
          </Link>
          <Link href={href('/account')} aria-label={t('account')} className="hidden md:flex p-2 hover:text-brass">
            <User className="h-5 w-5" />
          </Link>
          {isCatalogPage ? (
            <>
              <Suspense fallback={
                <button aria-label="Filters" className="flex md:hidden h-11 w-11 items-center justify-center hover:text-brass relative">
                  <SlidersHorizontal className="h-5 w-5" />
                </button>
              }>
                <HeaderFilterButton />
              </Suspense>
              <Link
                href={href('/wishlist')}
                aria-label={t('wishlist')}
                className="hidden md:flex h-11 w-11 items-center justify-center hover:text-brass"
              >
                <Heart className="h-5 w-5" />
              </Link>
            </>
          ) : (
            <Link
              href={href('/wishlist')}
              aria-label={t('wishlist')}
              className="flex h-11 w-11 items-center justify-center hover:text-brass"
            >
              <Heart className="h-5 w-5" />
            </Link>
          )}
          <Link
            href={href('/cart')}
            aria-label={t('cart')}
            className="relative flex h-11 w-11 items-center justify-center hover:text-brass"
          >
            <ShoppingBag className="h-5 w-5" />
            <CartCountBadge />
          </Link>
        </div>
      </div>
    </header>
  );
}
