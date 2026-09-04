// Delivery estimate resolver. Surfaces a LIVE courier quote (Yandex) for the
// in-city Tashkent method as an on-screen ESTIMATE only — the server-charged
// fee at order creation stays getDeliveryMethod(id).baseFee for now (a later
// phase makes the quote the charged fee + creates a shipment).
//
// Best-effort by design: any failure (unconfigured token, network, bad region)
// falls back to the method baseFee with source 'method' and never throws.

import { getDeliveryMethod } from '@/lib/delivery/methods';
import { findRegion, isTashkentCity } from '@/lib/delivery/uz-regions';
import {
  applyYandexMarkup,
  getYandexQuote,
  yandexConfigFromEnv,
  type YandexDestination,
} from '@/lib/delivery/yandex';

export interface DeliveryEstimateInput {
  region: string;
  district?: string;
  address?: string;
  method: string;
}

export interface DeliveryEstimate {
  method: string;
  /// Fee in so'm (integer UZS minor units).
  fee: number;
  /// 'yandex' when the fee came from a live provider quote; 'method' when it is
  /// the static baseFee fallback.
  source: 'yandex' | 'method';
  etaMinutes?: number;
}

// Markup applied to the raw provider price. Env-overridable so ops can tune the
// displayed estimate without a redeploy; defaults to no markup.
function markupFromEnv(): { type: 'NONE' | 'FIXED' | 'PERCENT'; value: number } {
  const rawType = (process.env.YANDEX_MARKUP_TYPE ?? 'NONE').toUpperCase();
  const type =
    rawType === 'FIXED' || rawType === 'PERCENT' ? (rawType as 'FIXED' | 'PERCENT') : 'NONE';
  const value = Number(process.env.YANDEX_MARKUP_VALUE ?? '0');
  return { type, value: Number.isFinite(value) ? value : 0 };
}

/**
 * Resolve a delivery estimate for the checkout UI.
 *
 * For the `courier-tashkent` method when the destination region is Tashkent
 * city, this calls the Yandex check-price API (warehouse from
 * yandexConfigFromEnv) and applies the configured markup. Any other
 * method/region — or any failure along the way — returns the method baseFee
 * with source 'method'.
 *
 * Never throws: callers can treat the result as always-present.
 */
export async function getDeliveryEstimate(input: DeliveryEstimateInput): Promise<DeliveryEstimate> {
  const method = getDeliveryMethod(input.method);
  // Unknown method id: nothing to quote, nothing sensible to charge. 0 fee,
  // 'method' source keeps the contract (best-effort, no throw).
  const baseFee = method?.baseFee ?? 0;
  const fallback: DeliveryEstimate = {
    method: input.method,
    fee: baseFee,
    source: 'method',
  };

  // Only the in-city courier option is live-quoted, and only when the region is
  // actually Tashkent city.
  if (input.method !== 'courier-tashkent' || !isTashkentCity(input.region)) {
    return fallback;
  }

  try {
    const config = yandexConfigFromEnv(); // throws if token missing → fallback

    // Coarse geocoding: we don't have a per-address geocoder here, so use the
    // region's center coordinates as the dropoff point. For Tashkent city this
    // is the city center — good enough for a display-only distance/price hint.
    // TODO(P3): geocode `${district} ${address}` for a per-address dropoff;
    // until then the estimate is city-center-coarse.
    const region = findRegion(input.region);
    if (!region) return fallback;

    const dropoffLabel = [input.address, input.district, input.region]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part && part.length > 0))
      .join(', ');

    const destination: YandexDestination = {
      address: dropoffLabel || input.region,
      lat: region.center.lat,
      lng: region.center.lng,
    };

    const quote = await getYandexQuote(config, destination);
    const markup = markupFromEnv();
    const fee = applyYandexMarkup(quote.price, markup.type, markup.value);

    return {
      method: input.method,
      fee,
      source: 'yandex',
      etaMinutes: quote.etaMinutes ?? undefined,
    };
  } catch {
    // Best-effort: swallow provider/config errors and show the static fee.
    return fallback;
  }
}
