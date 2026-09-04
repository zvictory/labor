import type { ReactNode } from 'react';

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';

// Store-group shell — wraps every storefront page (home, catalog, PDP) with the
// shared header/footer chrome. The parent app/[locale]/layout.tsx already sets
// the request locale and mounts NextIntlClientProvider, so useTranslations works
// in the (server) header/footer here.

// All storefront pages call Prisma at render time — opt the entire group out of
// static pre-rendering so Next.js never tries to run DB queries at build time.
export const dynamic = 'force-dynamic';
type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function StoreLayout({ children, params }: Props) {
  const { locale } = await params;

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <SiteHeader locale={locale} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} />
      <MobileBottomNav locale={locale} />
    </div>
  );
}
