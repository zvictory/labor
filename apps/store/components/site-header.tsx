import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  Boxes,
  FlaskConical,
  Gift,
  Heart,
  MapPin,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { CartCountBadge } from '@/components/cart/cart-count-badge';
import { LaborLogo } from '@/components/brand/labor-logo';
import type { accountNavigation } from '@/lib/account-navigation';
import { SiteMenu } from '@/components/site-menu';

// Site chrome. On a phone: menu and language left, the wordmark centred, search and
// cart right — every target 44 × 44. From xl up the menu's pages
// are listed inline at 2xl; any narrower, six labels do not fit beside a
// centred logo. Server-safe: useTranslations works in RSC under
// NextIntlClientProvider. All links are locale-prefixed.
export function SiteHeader({
  locale,
  account,
}: {
  locale: string;
  account: ReturnType<typeof accountNavigation>;
}) {
  const t = useTranslations('nav');
  const b = useTranslations('brand');
  const href = (path: string) => `/${locale}${path}`;

  const item = (path: string, label: string, Icon: LucideIcon) => ({
    href: href(path),
    label,
    icon: <Icon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.45} />,
  });
  const pages = [
    item('/catalog', t('shop'), ShoppingBag),
    item('/brands', t('brands'), Boxes),
    item('/notes', t('notes'), BookOpen),
    item('/perfumers', t('perfumers'), FlaskConical),
    item('/find-your-perfume', t('finder'), Sparkles),
    item('/delivery', t('delivery'), Truck),
  ];
  const menuPages = [
    { ...item('', account.label, UserRound), href: account.href },
    ...pages,
    item('/sets', t('sets'), Gift),
    item('/campaigns', t('campaigns'), Tag),
    item('/wishlist', t('wishlist'), Heart),
    item('/contacts', t('contacts'), MapPin),
  ];

  // Solid, not frosted. A translucent blurred bar is the one texture the shop
  // has nowhere — the island is a single opaque surface, and the header is the
  // screen's version of it. The hairline does the separating.
  return (
    <header className="border-border bg-background sticky top-0 z-40 border-b">
      <div className="grid h-16 grid-cols-[88px_1fr_88px] items-center px-1.5 md:container md:h-20 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex items-center 2xl:gap-4">
          <SiteMenu items={menuPages} openLabel={t('menu')} closeLabel={t('closeMenu')} />
          <nav className="hidden items-center gap-3 text-xs font-medium 2xl:flex">
            {pages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap hover:underline hover:underline-offset-4"
              >
                {page.icon}
                {page.label}
              </Link>
            ))}
          </nav>
          <LocaleSwitcher />
        </div>

        <Link href={href('')} aria-label={b('name')} className="flex justify-center">
          <LaborLogo />
        </Link>

        <div className="flex items-center justify-end">
          <Link
            href={account.href}
            className="hidden min-h-11 items-center gap-2 px-3 text-sm font-medium md:inline-flex"
          >
            <UserRound className="h-[18px] w-[18px]" strokeWidth={1.3} />
            <span className="hidden xl:inline">{account.label}</span>
            <span className="xl:hidden">{account.shortLabel}</span>
          </Link>
          <Link
            href={href('/search')}
            aria-label={t('search')}
            className="flex h-11 w-11 items-center justify-center"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.3} />
          </Link>
          {/* md+ only: the phone's right column holds two 44 px targets, and
              the menu carries the wishlist there. */}
          <Link
            href={href('/wishlist')}
            aria-label={t('wishlist')}
            className="hidden h-11 w-11 items-center justify-center md:flex"
          >
            <Heart className="h-[18px] w-[18px]" strokeWidth={1.3} />
          </Link>
          <Link
            href={href('/cart')}
            aria-label={t('cart')}
            className="relative flex h-11 w-11 items-center justify-center"
          >
            <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.3} />
            <CartCountBadge />
          </Link>
        </div>
      </div>
    </header>
  );
}
