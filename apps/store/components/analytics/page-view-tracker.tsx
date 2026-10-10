'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { trackPageView } from '@/lib/analytics';

// App Router navigations swap the page without a document load, so Metrica
// would count only the first page of every visit. This reports the rest. The
// first render is skipped: the tag's own init already counted that page.
export function PageViewTracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    trackPageView(window.location.href);
  }, [pathname]);

  return null;
}
