import { createHmac, timingSafeEqual } from 'node:crypto';

export const NOTIFY_MAX_SKEW_SECONDS = 5 * 60;

export const verifyInternalNotifySignature = (
  timestampHeader: string | undefined,
  signatureHeader: string | undefined,
  rawBody: string,
  token: string,
  nowSec = Math.floor(Date.now() / 1000)
): boolean => {
  if (!timestampHeader || !signatureHeader) return false;

  const timestamp = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(nowSec - timestamp) > NOTIFY_MAX_SKEW_SECONDS) return false;

  const expected = createHmac('sha256', token).update(`${timestamp}.${rawBody}`).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(signatureHeader, 'utf8');
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
};
