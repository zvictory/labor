// Fan a single typed event out to GA4 (gtag) and Meta Pixel (fbq). The pixel
// libraries are injected by analytics-scripts.tsx; if an ID env is unset that
// component renders nothing, so window.gtag / window.fbq stay undefined and
// every branch below no-ops. Safe in SSR, dev, test, and the Telegram miniapp.

import {
  ANALYTICS_CURRENCY,
  type AnalyticsEvent,
  type CheckoutEventPayload,
  type ProductEventPayload,
} from './events';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

// GA4 `items[]` entry. Strings for ids match the catalog feed we build in Wk2.
const gaItem = (p: ProductEventPayload) => ({
  item_id: String(p.id),
  item_name: p.name,
  price: p.price,
  quantity: p.quantity,
});

const trackGa = (event: AnalyticsEvent): void => {
  const gtag = window.gtag;
  if (!GA_ID || !gtag) return;

  switch (event.name) {
    case 'PageView':
      gtag('event', 'page_view');
      return;
    case 'ViewContent':
      gtag('event', 'view_item', {
        currency: ANALYTICS_CURRENCY,
        value: event.payload.price * event.payload.quantity,
        items: [gaItem(event.payload)],
      });
      return;
    case 'AddToCart':
      gtag('event', 'add_to_cart', {
        currency: ANALYTICS_CURRENCY,
        value: event.payload.price * event.payload.quantity,
        items: [gaItem(event.payload)],
      });
      return;
    case 'InitiateCheckout':
      gtag('event', 'begin_checkout', {
        currency: ANALYTICS_CURRENCY,
        value: event.payload.value,
        items: event.payload.contentIds.map((id) => ({ item_id: String(id) })),
      });
      return;
  }
};

const metaProduct = (p: ProductEventPayload) => ({
  content_ids: [String(p.id)],
  content_type: 'product',
  content_name: p.name,
  value: p.price * p.quantity,
  currency: ANALYTICS_CURRENCY,
});

const metaCheckout = (p: CheckoutEventPayload) => ({
  content_ids: p.contentIds.map(String),
  content_type: 'product',
  num_items: p.numItems,
  value: p.value,
  currency: ANALYTICS_CURRENCY,
});

const trackMeta = (event: AnalyticsEvent): void => {
  const fbq = window.fbq;
  if (!META_ID || !fbq) return;

  switch (event.name) {
    case 'PageView':
      fbq('track', 'PageView');
      return;
    case 'ViewContent':
      fbq('track', 'ViewContent', metaProduct(event.payload));
      return;
    case 'AddToCart':
      fbq('track', 'AddToCart', metaProduct(event.payload));
      return;
    case 'InitiateCheckout':
      fbq('track', 'InitiateCheckout', metaCheckout(event.payload));
      return;
  }
};

/** Emit one event to every configured pixel. No-op when nothing is configured. */
export const track = (event: AnalyticsEvent): void => {
  if (typeof window === 'undefined') return;
  trackGa(event);
  trackMeta(event);
};
