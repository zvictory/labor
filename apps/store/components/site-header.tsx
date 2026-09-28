import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, ShoppingBag } from 'lucide-react';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { CartCountBadge } from '@/components/cart/cart-count-badge';
import { SiteMenu } from '@/components/site-menu';

// Site chrome. On a phone: menu and language left, the wordmark centred, search and
// cart right — every target 44 × 44, the bar 56 px. From xl up the menu's pages
// are listed inline instead; any narrower, six labels do not fit beside a
// centred logo. Server-safe: useTranslations works in RSC under
// NextIntlClientProvider. All links are locale-prefixed.
export function SiteHeader({ locale }: { locale: string }) {
  const t = useTranslations('nav');
  const b = useTranslations('brand');
  const href = (path: string) => `/${locale}${path}`;

  const pages = [
    { href: href('/catalog'), label: t('shop') },
    { href: href('/brands'), label: t('brands') },
    { href: href('/notes'), label: t('notes') },
    { href: href('/perfumers'), label: t('perfumers') },
    // 450 lines of working guided search that nothing linked to.
    { href: href('/find-your-perfume'), label: t('finder') },
    { href: href('/delivery'), label: t('delivery') },
  ];

  // Solid, not frosted. A translucent blurred bar is the one texture the shop
  // has nowhere — the island is a single opaque surface, and the header is the
  // screen's version of it. The hairline does the separating.
  return (
    <header className="border-border bg-background sticky top-0 z-40 border-b">
      <div className="grid h-14 grid-cols-[88px_1fr_88px] items-center px-1.5 md:container md:h-16 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center xl:gap-6">
          <SiteMenu items={pages} openLabel={t('menu')} closeLabel={t('closeMenu')} />
          <nav className="text-label hidden items-center gap-6 font-mono tracking-[0.1em] uppercase xl:flex">
            {pages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="hover:underline hover:underline-offset-4"
              >
                {page.label}
              </Link>
            ))}
          </nav>
          <LocaleSwitcher />
        </div>

        <Link href={href('')} aria-label={b('name')} className="flex justify-center">
          {/* The wordmark alone, without the circle, at every width: inside the
              seal the lettering was too small to read. 36 px in the phone's
              56 px bar, 40 px in the 64 px bar from md up. */}
          <span className="font-logo text-ink dark:text-bone text-[36px] leading-none md:text-[40px]">
            {b('name')}
          </span>
        </Link>

        <div className="flex items-center justify-end">
          <Link
            href={href('/search')}
            aria-label={t('search')}
            className="flex h-11 w-11 items-center justify-center"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.3} />
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
