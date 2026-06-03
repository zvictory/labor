// Typed analytics event vocabulary shared by track.ts and every call site.
// A discriminated union (not loose strings) makes track() exhaustive: a new
// event forces the switch in track.ts to handle it, and payloads can't be
// crossed between events. Values are UZS integers — the store has no minor
// unit (100 sum = 100), so the price IS the event value, no /100 conversion.

export const ANALYTICS_CURRENCY = 'UZS' as const;

/** A single product line, used by ViewContent and AddToCart. */
export interface ProductEventPayload {
  id: number;
  name: string;
  price: number; // integer UZS (per unit)
  quantity: number;
}

/** The cart at checkout start, used by InitiateCheckout. */
export interface CheckoutEventPayload {
  value: number; // integer UZS (cart total)
  numItems: number;
  contentIds: number[];
}

export type AnalyticsEvent =
  | { name: 'PageView' }
  | { name: 'ViewContent'; payload: ProductEventPayload }
  | { name: 'AddToCart'; payload: ProductEventPayload }
  | { name: 'InitiateCheckout'; payload: CheckoutEventPayload };

export type AnalyticsEventName = AnalyticsEvent['name'];
