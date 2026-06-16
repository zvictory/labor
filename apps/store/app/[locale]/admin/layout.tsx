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

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const user = await requireStaff();

  const admin = isAdmin(user);
  const displayName = user.name ?? user.email ?? `#${user.id}`;
  const roleLabel = admin ? 'Администратор' : 'Сотрудник';

  return (
    <div className="flex min-h-screen flex-col bg-bone text-ink dark:bg-ink dark:text-bone md:flex-row">
      {/* Sidebar */}
      <aside className="flex shrink-0 flex-col border-b border-border md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-5">
          <Link
            href={`/${locale}/admin`}
            className="flex items-baseline gap-2 transition-opacity hover:opacity-90"
          >
            <span className="font-display text-2xl leading-none text-ink dark:text-bone">
              Labor
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
              Admin
            </span>
          </Link>
        </div>

        <div className="px-3 pb-4 md:flex-1">
          <AdminNav locale={locale} />
        </div>

        <div className="border-t border-border px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink dark:text-bone">
                {displayName}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brass">
                {roleLabel}
              </p>
            </div>
            <Link
              href={`/${locale}`}
              className="shrink-0 text-xs text-ink-muted underline-offset-4 hover:text-brass hover:underline dark:text-stone-400"
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
