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
    // Opaque, hairline-topped, unlifted. The frosted translucent bar and its
    // upward drop shadow were the two things that made this read as a layer
    // hovering over the page; the shop has no hovering layers.
    <nav className="border-border bg-background fixed right-0 bottom-0 left-0 z-40 h-[calc(64px+env(safe-area-inset-bottom))] w-full border-t pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex h-full items-stretch justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          // Determine if active
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive && (
                <div className="bg-foreground absolute top-0 left-1/2 h-[2px] w-8 -translate-x-1/2" />
              )}
              <div className="relative flex items-center justify-center">
                <Icon className="h-5 w-5 stroke-[2]" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-foreground text-background text-micro absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center px-1 font-mono leading-none">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-micro font-mono tracking-[0.16em] uppercase">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
