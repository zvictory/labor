import { Suspense, type ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CompareDrawer } from '@/components/compare/compare-drawer';
import { AnalyticsScripts } from '@/components/analytics/analytics-scripts';
import { AnalyticsListener } from '@/components/analytics/analytics-listener';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnalyticsScripts />
      <Suspense fallback={null}>
        <AnalyticsListener />
      </Suspense>
      <SiteHeader />
      <main className="flex-1 pb-24">{children}</main>
      <SiteFooter />
      <CompareDrawer />
    </div>
  );
}
