import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CompareDrawer } from '@/components/compare/compare-drawer';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pb-24">{children}</main>
      <SiteFooter />
      <CompareDrawer />
    </div>
  );
}
