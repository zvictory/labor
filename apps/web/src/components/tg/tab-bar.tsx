'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCartStore } from '@/lib/stores/cart-store';

interface Tab { href: string; label: string; icon: string }

export const TgTabBar = () => {
  const t = useTranslations('tg.tabs');
  const locale = useLocale();
  const path = usePathname();
  const cartCount = useCartStore((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));

  const tabs: Tab[] = [
    { href: `/${locale}/tg`,         label: t('home'),    icon: '🏠' },
    { href: `/${locale}/tg/catalog`, label: t('catalog'), icon: '🌿' },
    { href: `/${locale}/tg/cart`,    label: t('cart'),    icon: '🛒' },
    { href: `/${locale}/tg/orders`,  label: t('orders'),  icon: '📦' },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--tg-hint-color)]/20 bg-[var(--tg-bg-color)] safe-bottom">
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = path === tab.href || path.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${active ? 'text-[var(--tg-button-color)]' : 'text-[var(--tg-hint-color)]'}`}
              >
                <span className="relative text-lg" aria-hidden>
                  {tab.icon}
                  {tab.href.endsWith('/cart') && cartCount > 0 && (
                    <span className="absolute -right-3 -top-1 rounded-full bg-rose-600 px-1 text-[10px] text-white">{cartCount}</span>
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
