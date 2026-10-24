// Meta Conversions API: the server's copy of the events that matter to ad
// optimisation (Purchase, Lead). The pixel in the browser sends the same event
// under the same event_id, and Meta keeps one of the two; the server copy is
// what still arrives when an ad blocker or iOS stops the pixel.
//
// Off unless both NEXT_PUBLIC_META_PIXEL_ID and META_CAPI_TOKEN are set.
// META_TEST_EVENT_CODE sends everything to Events Manager → Test events
// instead, for checking a setup. Personal data is hashed (SHA-256) before it
// leaves, as Meta requires; only the phone number is sent, never a name or an
// address.
//
// https://developers.facebook.com/docs/marketing-api/conversions-api

import { createHash } from 'node:crypto';

import { normalizeUzPhone } from '@/lib/phone';

/** Graph API version used when META_GRAPH_VERSION is unset. v25.0 shipped in February 2026. */
export const DEFAULT_GRAPH_VERSION = 'v25.0';

export type CapiEventName = 'Purchase' | 'Lead';

export interface CapiVisitor {
  clientIp: string | null;
  userAgent: string | null;
  /** The _fbp cookie the pixel sets. */
  fbp: string | null;
  /** The _fbc cookie, or one built from a stored fbclid. */
  fbc: string | null;
}

export interface CapiEventInput {
  eventName: CapiEventName;
  /** Same id the pixel used: the order number, or the request's event id. */
  eventId: string;
  eventTime: Date;
  sourceUrl: string;
  phone: string | null;
  /** Our user id, when the buyer is signed in. */
  externalId: string | null;
  visitor: CapiVisitor;
  customData: Record<string, unknown>;
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** Meta's phone format before hashing: country code and digits only, e.g. 998901234567. */
export const metaPhone = (raw: string): string | null => {
  const phone = normalizeUzPhone(raw);
  return phone ? phone.slice(1) : null;
};

/** `fb.1.<ms>.<fbclid>`, the value the pixel would have put in the _fbc cookie. */
export const fbcFromClick = (fbclid: string, clickedAt: number): string =>
  `fb.1.${clickedAt}.${fbclid}`;

/** The first address in X-Forwarded-For (nginx adds the visitor's), else X-Real-IP. */
export const clientIpFrom = (forwardedFor: string | null, realIp: string | null): string | null => {
  const first = forwardedFor?.split(',')[0]?.trim();
  return first || realIp?.trim() || null;
};

/** One event in the shape the /events endpoint takes. Pure. */
export const buildCapiEvent = (input: CapiEventInput): Record<string, unknown> => {
  const phone = input.phone ? metaPhone(input.phone) : null;
  const userData: Record<string, unknown> = {
    country: [sha256('uz')],
    ...(phone ? { ph: [sha256(phone)] } : {}),
    ...(input.externalId ? { external_id: [sha256(input.externalId)] } : {}),
    ...(input.visitor.clientIp ? { client_ip_address: input.visitor.clientIp } : {}),
    ...(input.visitor.userAgent ? { client_user_agent: input.visitor.userAgent } : {}),
    ...(input.visitor.fbp ? { fbp: input.visitor.fbp } : {}),
    ...(input.visitor.fbc ? { fbc: input.visitor.fbc } : {}),
  };
  return {
    event_name: input.eventName,
    event_time: Math.floor(input.eventTime.getTime() / 1000),
    event_id: input.eventId,
    action_source: 'website',
    event_source_url: input.sourceUrl,
    user_data: userData,
    custom_data: input.customData,
  };
};

interface CapiConfig {
  pixelId: string;
  token: string;
  version: string;
  testEventCode: string | null;
}

export const capiConfig = (
  env: Record<string, string | undefined> = process.env,
): CapiConfig | null => {
  const pixelId = env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const token = env.META_CAPI_TOKEN?.trim();
  if (!pixelId || !/^\d{6,20}$/.test(pixelId) || !token) return null;
  const version = env.META_GRAPH_VERSION?.trim();
  return {
    pixelId,
    token,
    version: version && /^v\d+\.\d+$/.test(version) ? version : DEFAULT_GRAPH_VERSION,
    testEventCode: env.META_TEST_EVENT_CODE?.trim() || null,
  };
};

/**
 * Send one event. Best effort: a Meta outage or a bad token is logged, never
 * thrown, so it cannot fail an order. Returns whether Meta accepted it.
 */
export const sendCapiEvent = async (
  input: CapiEventInput,
  config: CapiConfig | null = capiConfig(),
): Promise<boolean> => {
  if (!config) return false;
  const body = {
    data: [buildCapiEvent(input)],
    ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
  };
  try {
    const res = await fetch(
      `https://graph.facebook.com/${config.version}/${config.pixelId}/events?access_token=${encodeURIComponent(config.token)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      console.error(
        `[meta:capi] ${input.eventName} ${input.eventId}: HTTP ${res.status}`,
        await res.text(),
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[meta:capi] ${input.eventName} ${input.eventId}:`, err);
    return false;
  }
};
