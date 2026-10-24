// What the Conversions API needs to know about the visitor, read from the
// request: IP and browser for matching, and the pixel's click and browser ids.
// Read before an after() callback runs, while the request is still at hand.

import { cookies, headers } from 'next/headers';

import type { Attribution } from '@/lib/attribution/attribution';
import { clientIpFrom, fbcFromClick, type CapiVisitor } from './capi';

export const readCapiVisitor = async (attribution: Attribution | null): Promise<CapiVisitor> => {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const fbc =
    c.get('_fbc')?.value ??
    (attribution?.fbclid ? fbcFromClick(attribution.fbclid, attribution.at) : null);
  return {
    clientIp: clientIpFrom(h.get('x-forwarded-for'), h.get('x-real-ip')),
    userAgent: h.get('user-agent'),
    fbp: c.get('_fbp')?.value ?? null,
    fbc,
  };
};

/** The page the event happened on, when the browser said; else `fallback`. */
export const readSourceUrl = async (fallback: string): Promise<string> => {
  const referer = (await headers()).get('referer');
  return referer && /^https?:\/\//.test(referer) ? referer : fallback;
};
