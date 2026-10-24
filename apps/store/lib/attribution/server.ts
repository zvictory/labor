// Server-side read of the attribution cookie the middleware sets.

import { cookies } from 'next/headers';

import { ATTRIBUTION_COOKIE, decodeAttribution, type Attribution } from './attribution';

export const readAttribution = async (): Promise<Attribution | null> =>
  decodeAttribution((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
