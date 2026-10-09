'use client';

import { useEffect } from 'react';

import { track, type AnalyticsEvent, type AnalyticsParams } from '@/lib/analytics';

// Fires one analytics event when a server-rendered page is shown, e.g.
// begin_checkout on the checkout page. With `onceKey` the event is sent at most
// once per browser, so reloading an order page does not count a second sale.
export function TrackEvent({
  event,
  params,
  onceKey,
}: {
  event: AnalyticsEvent;
  params?: AnalyticsParams;
  onceKey?: string;
}) {
  useEffect(() => {
    if (onceKey) {
      const storageKey = `labor:tracked:${onceKey}`;
      try {
        if (window.localStorage.getItem(storageKey)) return;
        window.localStorage.setItem(storageKey, '1');
      } catch {
        // Storage blocked (private mode): send anyway rather than never.
      }
    }
    track(event, params);
    // Server-rendered props: one event per mount is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
