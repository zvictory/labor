// Visitor analytics: Yandex Metrica (what most shops in Uzbekistan use) and
// Google Analytics 4. Both are off until their id is set in the environment,
// so development and preview builds send nothing.
//
//   NEXT_PUBLIC_YANDEX_METRICA_ID   counter number, e.g. 98765432
//   NEXT_PUBLIC_GA_MEASUREMENT_ID   e.g. G-ABC123XYZ
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

/** The funnel steps worth counting. Names follow GA4's recommended events. */
export type AnalyticsEvent =
  | 'add_to_cart'
  | 'add_to_wishlist'
  | 'begin_checkout'
  | 'purchase'
  | 'generate_lead';

export type AnalyticsParams = Record<string, string | number | boolean>;

type Ym = (id: number, method: string, ...args: unknown[]) => void;
type Gtag = (command: string, ...args: unknown[]) => void;
type Counters = { ym?: Ym; gtag?: Gtag };

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

/** Send one event to every configured counter. */
export const track = (event: AnalyticsEvent, params: AnalyticsParams = {}): void => {
  if (YANDEX_METRICA_ID) {
    const id = Number(YANDEX_METRICA_ID);
    whenLoaded('ym', (ym) => ym(id, 'reachGoal', event, params));
  }
  if (GA_MEASUREMENT_ID) whenLoaded('gtag', (gtag) => gtag('event', event, params));
};

/** Count a client-side navigation; the first page view is counted by the tags themselves. */
export const trackPageView = (url: string): void => {
  // GA4 counts history changes on its own (enhanced measurement).
  if (YANDEX_METRICA_ID) {
    const id = Number(YANDEX_METRICA_ID);
    whenLoaded('ym', (ym) => ym(id, 'hit', url));
  }
};
