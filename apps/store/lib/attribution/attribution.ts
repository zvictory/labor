// Which ad, post or link brought a visitor, so an order or a "help me choose"
// request can be traced back to it. Instagram, Telegram and Meta ads all land
// on the site with utm_* tags, and Meta adds fbclid to every ad click.
//
// The middleware keeps the tags of the latest tagged visit in a first-party
// cookie for 30 days (last touch: a visit without tags keeps the old ones).
// Orders and requests copy them when they are created. Pure, so the middleware
// (edge) and the server code share it.

import { z } from 'zod';

export const ATTRIBUTION_COOKIE = 'labor_src';
export const ATTRIBUTION_MAX_AGE_S = 30 * 24 * 60 * 60;

export interface Attribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  fbclid: string | null;
  /** When the tagged visit happened, ms since epoch; Meta's fbc needs it. */
  at: number;
}

const PARAMS = {
  utmSource: 'utm_source',
  utmMedium: 'utm_medium',
  utmCampaign: 'utm_campaign',
  utmContent: 'utm_content',
  fbclid: 'fbclid',
} as const;

type Field = keyof typeof PARAMS;

const MAX_LENGTH: Record<Field, number> = {
  utmSource: 100,
  utmMedium: 100,
  utmCampaign: 100,
  utmContent: 100,
  fbclid: 500,
};

/**
 * Trimmed, printable, bounded; null when nothing usable is left. UTM values
 * are lower-cased so `Instagram` and `instagram` count as one source; fbclid
 * is an opaque id and keeps its case.
 */
const clean = (field: Field, raw: string | null): string | null => {
  if (!raw) return null;
  const value = raw
    .replace(/[^\x20-\x7EЀ-ӿ]/g, '')
    .trim()
    .slice(0, MAX_LENGTH[field]);
  if (!value) return null;
  return field === 'fbclid' ? value : value.toLowerCase();
};

/** The tags on a landing URL, or null when it carries none. */
export const attributionFromParams = (
  params: URLSearchParams,
  now: number = Date.now(),
): Attribution | null => {
  const fields = Object.fromEntries(
    (Object.keys(PARAMS) as Field[]).map((field) => [
      field,
      clean(field, params.get(PARAMS[field])),
    ]),
  ) as Record<Field, string | null>;
  if (Object.values(fields).every((v) => v === null)) return null;
  return { ...fields, at: now };
};

const nullableText = z.string().max(500).nullable().catch(null);

const cookieSchema = z.object({
  utmSource: nullableText,
  utmMedium: nullableText,
  utmCampaign: nullableText,
  utmContent: nullableText,
  fbclid: nullableText,
  at: z.number().int().positive(),
});

export const encodeAttribution = (a: Attribution): string => JSON.stringify(a);

/** The cookie's value back as an Attribution; null for anything malformed. */
export const decodeAttribution = (raw: string | undefined | null): Attribution | null => {
  if (!raw) return null;
  try {
    const parsed = cookieSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/** The columns an Order or a ConsultRequest stores. */
export const attributionColumns = (a: Attribution | null) => ({
  utmSource: a?.utmSource ?? null,
  utmMedium: a?.utmMedium ?? null,
  utmCampaign: a?.utmCampaign ?? null,
  utmContent: a?.utmContent ?? null,
  fbclid: a?.fbclid ?? null,
});

/** One line for staff: `instagram / paid / 2plus1 / dark_4x5`, or null for a direct visit. */
export const describeAttribution = (a: {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  fbclid: string | null;
}): string | null => {
  const parts = [a.utmSource, a.utmMedium, a.utmCampaign, a.utmContent].filter(Boolean);
  if (parts.length === 0) return a.fbclid ? 'meta (fbclid)' : null;
  return parts.join(' / ');
};
