// Visitor analytics: Yandex Metrica (what most shops in Uzbekistan use),
// Google Analytics 4 and the Meta pixel (Instagram and Facebook ads). Each is
// off until its id is set in the environment, so development and preview
// builds send nothing.
//
//   NEXT_PUBLIC_YANDEX_METRICA_ID   counter number, e.g. 98765432
//   NEXT_PUBLIC_GA_MEASUREMENT_ID   e.g. G-ABC123XYZ
//   NEXT_PUBLIC_META_PIXEL_ID       dataset (pixel) id, e.g. 1234567890123456
//
// Purchases and requests also go to Meta from the server (lib/meta/capi.ts)
// under the same event id, so Meta counts each once even when an ad blocker
// stops the pixel.
//
// The ids are inlined into a <script>, so anything that is not the expected
// shape is dropped rather than printed.

const read = (value: string | undefined, shape: RegExp): string | null =>
  value && shape.test(value) ? value : null;

export const YANDEX_METRICA_ID = read(process.env.NEXT_PUBLIC_YANDEX_METRICA_ID, /^\d{4,12}$/);
export const GA_MEASUREMENT_ID = read(
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  /^G-[A-Z0-9]{4,16}$/,
);
export const META_PIXEL_ID = read(process.env.NEXT_PUBLIC_META_PIXEL_ID, /^\d{6,20}$/);

/** The funnel steps worth counting. Names follow GA4's recommended events. */
export type AnalyticsEvent =
  | 'view_item'
  | 'add_to_cart'
  | 'add_to_wishlist'
  | 'begin_checkout'
  | 'purchase'
  | 'generate_lead';

export type AnalyticsParams = Record<string, string | number | boolean>;

type Ym = (id: number, method: string, ...args: unknown[]) => void;
type Gtag = (command: string, ...args: unknown[]) => void;
type Fbq = (command: string, ...args: unknown[]) => void;
type Counters = { ym?: Ym; gtag?: Gtag; fbq?: Fbq };

/** Meta's standard event for each funnel step. */
export const META_EVENT: Record<AnalyticsEvent, string> = {
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  add_to_wishlist: 'AddToWishlist',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
  generate_lead: 'Lead',
};

/** Our GA4-style params in the shape Meta's standard events expect. */
export const metaEventData = (params: AnalyticsParams): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  if (typeof params.value === 'number') data.value = params.value;
  if (typeof params.currency === 'string') data.currency = params.currency;
  if (params.item_id !== undefined) {
    data.content_ids = [String(params.item_id)];
    data.content_type = 'product';
  }
  if (typeof params.transaction_id === 'string') data.order_id = params.transaction_id;
  if (typeof params.source === 'string') data.content_category = params.source;
  return data;
};

const RETRY_MS = 250;
const RETRIES = 20;

/**
 * Run `send` once the named counter is on window. The tags load after the page
 * is interactive, so an event fired on mount (begin_checkout, purchase) can
 * arrive first; it waits up to ~5 s instead of being lost. Never throws.
 */
const whenLoaded = <K extends keyof Counters>(
  name: K,
  send: (counter: NonNullable<Counters[K]>) => void,
  retries = RETRIES,
): void => {
  if (typeof window === 'undefined') return;
  const counter = (window as unknown as Counters)[name];
  if (!counter) {
    if (retries > 0) window.setTimeout(() => whenLoaded(name, send, retries - 1), RETRY_MS);
    return;
  }
  try {
    send(counter as NonNullable<Counters[K]>);
  } catch {
    // A blocked or half-loaded counter must not break the page that called it.
  }
};

/**
 * Send one event to every configured counter. `eventId` is the id the server
 * sent the same event to Meta under (a purchase's order number, a request's
 * id); a purchase without one uses its transaction_id.
 */
export const track = (
  event: AnalyticsEvent,
  params: AnalyticsParams = {},
  opts: { eventId?: string } = {},
): void => {
  if (YANDEX_METRICA_ID) {
    const id = Number(YANDEX_METRICA_ID);
    whenLoaded('ym', (ym) => ym(id, 'reachGoal', event, params));
  }
  if (GA_MEASUREMENT_ID) whenLoaded('gtag', (gtag) => gtag('event', event, params));
  if (META_PIXEL_ID) {
    const eventId =
      opts.eventId ??
      (typeof params.transaction_id === 'string' ? params.transaction_id : undefined);
    whenLoaded('fbq', (fbq) =>
      fbq('track', META_EVENT[event], metaEventData(params), eventId ? { eventID: eventId } : {}),
    );
  }
};

/** Count a client-side navigation; the first page view is counted by the tags themselves. */
export const trackPageView = (url: string): void => {
  // GA4 counts history changes on its own (enhanced measurement).
  if (YANDEX_METRICA_ID) {
    const id = Number(YANDEX_METRICA_ID);
    whenLoaded('ym', (ym) => ym(id, 'hit', url));
  }
  if (META_PIXEL_ID) whenLoaded('fbq', (fbq) => fbq('track', 'PageView'));
};
