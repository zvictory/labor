'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Grid, Search, ShoppingBag, User } from 'lucide-react';

import type { CartDTO } from '@/lib/cart/cart';
import { onCartUpdated } from '@/components/cart/cart-events';

const homeLabels: Record<string, string> = {
  en: 'Home',
  ru: 'Главная',
  uz: 'Bosh sahifa',
};

interface MobileBottomNavProps {
  locale: string;
}

export function MobileBottomNav({ locale }: MobileBottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const [cartCount, setCartCount] = useState(0);

  // Fetch cart count on mount and listen to cart updates
  useEffect(() => {
    let active = true;

    fetch('/api/cart')
      .then((res) => (res.ok ? (res.json() as Promise<CartDTO>) : null))
      .then((cart) => {
        if (active && cart) {
          setCartCount(cart.itemCount);
        }
      })
      .catch(() => {
        // Fallback or ignore
      });

    const off = onCartUpdated((cart) => {
      setCartCount(cart.itemCount);
    });

    return () => {
      active = false;
      off();
    };
  }, []);

  const homeLabel = homeLabels[locale] || homeLabels.en;

  const NAV_ITEMS = [
    {
      href: `/${locale}`,
      icon: Home,
      label: homeLabel,
      exact: true,
    },
    {
      href: `/${locale}/catalog`,
      icon: Grid,
      label: t('shop'),
      exact: false,
    },
    {
      href: `/${locale}/search`,
      icon: Search,
      label: t('search'),
      exact: false,
    },
    {
      href: `/${locale}/cart`,
      icon: ShoppingBag,
      label: t('cart'),
      exact: false,
      badge: cartCount,
    },
    {
      href: `/${locale}/account`,
      icon: User,
      label: t('account'),
      exact: false,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] w-full border-t border-stone-200/80 bg-white/90 backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-900/90 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] md:hidden">
      <div className="flex h-full items-stretch justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          // Determine if active
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? 'text-brass dark:text-brass-300 animate-in fade-in duration-300'
                  : 'text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-brass rounded-full" />
              )}
              <div className="relative flex items-center justify-center">
                <Icon className="h-5 w-5 stroke-[2]" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brass px-0.5 text-[8px] font-bold leading-none text-bone animate-in zoom-in-50 duration-200">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
