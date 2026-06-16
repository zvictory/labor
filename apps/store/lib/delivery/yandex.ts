// Yandex Delivery (Cargo B2B) client wrapper, ported in shape from bebio
// (lib/yandex-delivery-client.ts). Covers quote (check-price), claim creation
// (shipment), info, and accept. Env-configured; kept minimal with clear TODOs
// where the live API spec needs confirming against the current Yandex docs.
//
// https://yandex.ru/dev/logistics/delivery/
//
// Env:
//   YANDEX_DELIVERY_TOKEN        Bearer token for the b2b cargo API
//   YANDEX_WAREHOUSE_ADDRESS     human-readable pickup address (fullname)
//   YANDEX_WAREHOUSE_LAT / _LNG  pickup coordinates
//   YANDEX_WAREHOUSE_CONTACT     pickup contact name
//   YANDEX_WAREHOUSE_PHONE       pickup contact phone

const API_BASE = 'https://b2b.taxi.yandex.net/b2b/cargo/integration/v2';
const REQUEST_TIMEOUT_MS = 10_000;

export interface YandexClientConfig {
  apiToken: string;
  warehouseAddress: string;
  warehouseLat: number;
  warehouseLng: number;
}

export interface YandexDestination {
  address: string;
  lat: number;
  lng: number;
}

export interface YandexQuote {
  /// Price in so'm (integer UZS minor units), already rounded.
  price: number;
  etaMinutes: number | null;
  distanceMeters: number | null;
}

export interface YandexClaim {
  id: string;
  status: string;
  version: number;
}

type YandexApiError = { code?: string; message?: string };

/// Build a config from environment. Throws if the token is missing so callers
/// fail fast rather than hitting the API unauthenticated.
export function yandexConfigFromEnv(): YandexClientConfig {
  const apiToken = process.env.YANDEX_DELIVERY_TOKEN ?? '';
  if (!apiToken) {
    throw new Error('YANDEX_DELIVERY_TOKEN is not set');
  }
  return {
    apiToken,
    warehouseAddress: process.env.YANDEX_WAREHOUSE_ADDRESS ?? '',
    warehouseLat: Number(process.env.YANDEX_WAREHOUSE_LAT ?? '0'),
    warehouseLng: Number(process.env.YANDEX_WAREHOUSE_LNG ?? '0'),
  };
}

async function yandexRequest<T>(
  config: YandexClientConfig,
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
      ...init.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const payload = (await response.json().catch(() => ({}))) as T & YandexApiError;
  if (!response.ok) {
    console.error('[yandex] API error', path, JSON.stringify(payload));
    throw new Error(payload.message || payload.code || `Yandex API ${response.status}`);
  }
  return payload;
}

/// Apply a configured markup to a raw provider price (so'm).
export function applyYandexMarkup(
  price: number,
  markupType: 'NONE' | 'FIXED' | 'PERCENT',
  markupValue: number,
): number {
  if (markupType === 'FIXED') return Math.max(0, price + markupValue);
  if (markupType === 'PERCENT') return Math.max(0, Math.round(price * (1 + markupValue / 100)));
  return Math.max(0, price);
}

/// Get a delivery price quote from warehouse to destination.
/// TODO(P4): confirm `/check-price` request schema and price field against the
/// current Yandex Cargo spec; package size/weight below are sensible defaults
/// for a perfume parcel.
export async function getYandexQuote(
  config: YandexClientConfig,
  destination: YandexDestination,
  weightKg = 1,
): Promise<YandexQuote> {
  const result = await yandexRequest<{
    price: string | number | { price_with_vat?: string | number };
    eta?: number;
    distance_meters?: number;
  }>(config, '/check-price', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        {
          size: { length: 0.3, width: 0.3, height: 0.3 },
          weight: weightKg,
          quantity: 1,
          pickup_point: 1,
          dropoff_point: 2,
        },
      ],
      route_points: [
        { id: 1, coordinates: [config.warehouseLng, config.warehouseLat], fullname: config.warehouseAddress },
        { id: 2, coordinates: [destination.lng, destination.lat], fullname: destination.address },
      ],
      requirements: { taxi_class: 'courier' },
      skip_door_to_door: true,
    }),
  });

  const rawPrice = typeof result.price === 'object' ? result.price.price_with_vat : result.price;
  const price = Math.round(Number(rawPrice));
  if (!Number.isFinite(price)) throw new Error('Yandex returned no price');

  return {
    price,
    etaMinutes: result.eta ?? null,
    distanceMeters: result.distance_meters ?? null,
  };
}

/// Create a delivery claim (shipment). `requestId` MUST be stable per order so
/// retries are idempotent on Yandex's side.
/// TODO(P4): verify claim payload + lifecycle (create -> accept) against spec.
export async function createYandexClaim(
  config: YandexClientConfig,
  requestId: string,
  payload: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    destination: YandexDestination;
    warehouseContactName: string;
    warehousePhone: string;
  },
): Promise<YandexClaim> {
  return yandexRequest<YandexClaim>(
    config,
    `/claims/create?request_id=${encodeURIComponent(requestId)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            title: `Labor #${payload.orderNumber}`,
            size: { length: 0.3, width: 0.3, height: 0.3 },
            weight: 1,
            quantity: 1,
            pickup_point: 1,
            dropoff_point: 2,
          },
        ],
        route_points: [
          {
            point_id: 1,
            visit_order: 1,
            type: 'source',
            contact: { name: payload.warehouseContactName, phone: payload.warehousePhone },
            address: {
              fullname: config.warehouseAddress,
              coordinates: [config.warehouseLng, config.warehouseLat],
            },
          },
          {
            point_id: 2,
            visit_order: 2,
            type: 'destination',
            contact: { name: payload.customerName, phone: payload.customerPhone },
            address: {
              fullname: payload.destination.address,
              coordinates: [payload.destination.lng, payload.destination.lat],
            },
          },
        ],
        client_requirements: { taxi_class: 'express' },
        skip_client_notify: false,
      }),
    },
  );
}

/// Fetch claim status/pricing.
export async function getYandexClaimInfo(
  config: YandexClientConfig,
  claimId: string,
): Promise<YandexClaim & { pricing?: { final_price?: string; offer?: { price?: string } } }> {
  return yandexRequest(config, `/claims/info?claim_id=${encodeURIComponent(claimId)}`, {
    method: 'POST',
    body: '{}',
  });
}

/// Accept (confirm) a created claim at a given version.
export async function acceptYandexClaim(
  config: YandexClientConfig,
  claimId: string,
  version: number,
): Promise<YandexClaim> {
  return yandexRequest<YandexClaim>(
    config,
    `/claims/accept?claim_id=${encodeURIComponent(claimId)}`,
    { method: 'POST', body: JSON.stringify({ version }) },
  );
}
