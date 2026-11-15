// Who may call the /api/cron routes: whoever holds CRON_SECRET (the server's
// crontab). Without a secret of a sane length the routes stay shut.

import { timingSafeEqual } from 'node:crypto';

export const MIN_CRON_SECRET_LENGTH = 24;

/** Whether `authorization` is `Bearer <CRON_SECRET>`, compared in constant time. */
export const isCronAuthorized = (
  authorization: string | null,
  secret: string | undefined = process.env.CRON_SECRET,
): boolean => {
  if (!secret || secret.length < MIN_CRON_SECRET_LENGTH || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authorization);
  return given.length === expected.length && timingSafeEqual(given, expected);
};
