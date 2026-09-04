import type { ReactNode } from 'react';
import Link from 'next/link';

import { requireStaff, isAdmin } from '@/lib/admin/guard';
import { AdminNav } from '@/components/admin/admin-nav';
import { SignOutButton } from '@/components/account/sign-out-button';

// Admin shell. Server component: guards the entire /[locale]/admin/** subtree via
// requireStaff() (redirects guests / non-staff before any child renders), then
// frames children with a utilitarian sidebar + topbar. Deliberately does NOT mount
// SiteHeader/SiteFooter — the operator console is its own surface. Styling reuses
// the bone/ink/brass tokens but stays lighter and denser than the storefront.

// requireStaff() reads cookies (via auth()); make the dynamic nature explicit so
// Next.js never attempts to pre-render admin pages at build time.
export const dynamic = 'force-dynamic';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const user = await requireStaff();

  const admin = isAdmin(user);
  const displayName = user.name ?? user.email ?? `#${user.id}`;
  const roleLabel = admin ? 'Администратор' : 'Сотрудник';

  return (
    <div className="bg-bone text-ink dark:bg-ink dark:text-bone flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="border-border flex shrink-0 flex-col border-b md:w-64 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-5 py-5">
          <Link
            href={`/${locale}/admin`}
            className="flex items-baseline gap-2 transition-opacity hover:opacity-90"
          >
            <span className="font-display text-ink dark:text-bone text-2xl leading-none">
              Labor
            </span>
            <span className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
              Admin
            </span>
          </Link>
        </div>

        <div className="px-3 pb-4 md:flex-1">
          <AdminNav locale={locale} />
        </div>

        <div className="border-border border-t px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-ink dark:text-bone truncate text-sm font-medium">{displayName}</p>
              <p className="text-micro text-brass font-bold tracking-[0.2em] uppercase">
                {roleLabel}
              </p>
            </div>
            <Link
              href={`/${locale}`}
              className="text-ink-muted hover:text-foreground shrink-0 text-xs underline-offset-4 hover:underline dark:text-stone-400"
            >
              На сайт
            </Link>
          </div>
          <div className="mt-3">
            <SignOutButton locale={locale} />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1 px-5 py-8 md:px-8 md:py-10">{children}</main>
    </div>
  );
}
