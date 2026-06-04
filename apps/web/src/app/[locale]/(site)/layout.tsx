import { Suspense, type ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CompareDrawer } from '@/components/compare/compare-drawer';
import { AnalyticsScripts } from '@/components/analytics/analytics-scripts';
import { AnalyticsListener } from '@/components/analytics/analytics-listener';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function SiteLayout({ children, params }: Props) {
  const { locale } = await params;

  return (
    <div className="flex min-h-screen flex-col">
      <AnalyticsScripts />
      <Suspense fallback={null}>
        <AnalyticsListener />
      </Suspense>
      <SiteHeader locale={locale} />
      <main className="flex-1 pb-24">{children}</main>
      <SiteFooter locale={locale} />
      <CompareDrawer />
    </div>
  );
}
