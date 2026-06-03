'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { persistUtm } from '@/lib/analytics/utm';
import { track } from '@/lib/analytics/track';

// SPA page-view + UTM capture. App Router navigations don't reload the page, so
// the pixels' built-in page tracking would only ever see the first URL. This
// fires PageView on mount and every pathname/query change, and persists any
// utm_* params to localStorage (first-touch sticky, last-touch refreshed) so
// they ride along to the order at checkout.
//
// useSearchParams forces this subtree to client-render; the caller wraps it in
// <Suspense> so static prerendering of the rest of the layout is unaffected.
export const AnalyticsListener = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    persistUtm(new URLSearchParams(searchParams.toString()));
    track({ name: 'PageView' });
  }, [pathname, searchParams]);

  return null;
};
