'use client';

// Admin navigation island. Needs usePathname for active-link highlighting, so it's
// the one client piece of the admin chrome. The parent layout (a server component)
// passes the resolved locale and pre-builds locale-prefixed hrefs here.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Megaphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string; // locale-prefixed
  label: string;
  icon: LucideIcon;
  /** Match this exactly (dashboard root) instead of by prefix. */
  exact?: boolean;
}

export function AdminNav({ locale }: { locale: string }) {
  const pathname = usePathname();
  const base = `/${locale}/admin`;

  const items: NavItem[] = [
    { href: base, label: 'Обзор', icon: LayoutDashboard, exact: true },
    { href: `${base}/catalog`, label: 'Каталог', icon: Package },
    { href: `${base}/orders`, label: 'Заказы', icon: ShoppingCart },
    { href: `${base}/campaigns`, label: 'Кампании', icon: Megaphone },
  ];

  const isActive = (item: NavItem): boolean =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-ink text-bone dark:bg-bone dark:text-ink'
                : 'text-ink-muted hover:bg-ink/5 hover:text-ink dark:text-stone-400 dark:hover:bg-bone/10 dark:hover:text-bone'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
