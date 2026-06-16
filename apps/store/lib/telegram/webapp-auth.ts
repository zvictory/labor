// Telegram signature verification — the cryptographic trust boundary for both
// the Login Widget and the Mini App (WebApp) flows. Consumed by the auth agent.
//
// Two distinct schemes (Telegram uses different secret derivations for each):
//   - Login Widget: key = SHA256(botToken); data_check_string = sorted "k=v"
//     of every field except `hash`, newline-joined; HMAC-SHA256 compared to hash.
//   - WebApp initData: secret = HMAC-SHA256(key="WebAppData", msg=botToken);
//     data_check_string built the same way from the initData query string.
//
// Both comparisons are constant-time. Neither throws — callers get a boolean /
// a discriminated result and decide policy (e.g. auth_date freshness) themselves.

import { createHash, createHmac, timingSafeEqual } from 'crypto';

/// Constant-time compare of two lowercase hex digests. Length-checks first so a
/// malformed/short `hash` can't throw inside timingSafeEqual.
function hexEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length || ab.length === 0) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/// Build the canonical data_check_string: every entry except `hash`, rendered as
/// `key=value`, sorted by key, joined with `\n`.
function dataCheckString(entries: Iterable<[string, string]>): string {
  return Array.from(entries)
    .filter(([k]) => k !== 'hash')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

/// Verify a Telegram Login Widget payload.
/// Login Widget key derivation: secret = SHA256(botToken) (raw bytes).
/// Returns false for any missing/invalid hash rather than throwing.
export function verifyTelegramLogin(
  data: Record<string, string>,
  botToken: string,
): boolean {
  const hash = data.hash;
  if (!hash || !botToken) return false;

  const checkString = dataCheckString(Object.entries(data));
  const secretKey = createHash('sha256').update(botToken).digest();
  const expected = createHmac('sha256', secretKey).update(checkString).digest('hex');

  return hexEquals(expected, hash);
}

/// Parsed WebApp user (only the fields the app relies on; Telegram may send more).
export interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  username?: string;
}

/// Result of verifying WebApp initData: ok=false on any signature/parse failure.
export interface VerifyWebAppResult {
  ok: boolean;
  user?: TelegramWebAppUser;
}

/// Verify Telegram Mini App (WebApp) initData.
/// WebApp key derivation: secret = HMAC-SHA256(key="WebAppData", msg=botToken).
/// On success, parses the `user` JSON field into a typed object.
export function verifyTelegramWebAppInitData(
  initData: string,
  botToken: string,
): VerifyWebAppResult {
  if (!initData || !botToken) return { ok: false };

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false };
  }

  const hash = params.get('hash');
  if (!hash) return { ok: false };

  const checkString = dataCheckString(params.entries());
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secretKey).update(checkString).digest('hex');

  if (!hexEquals(expected, hash)) return { ok: false };

  const userRaw = params.get('user');
  if (!userRaw) return { ok: true };

  try {
    const parsed = JSON.parse(userRaw) as {
      id?: unknown;
      first_name?: unknown;
      username?: unknown;
    };
    if (typeof parsed.id !== 'number') return { ok: true };
    const user: TelegramWebAppUser = { id: parsed.id };
    if (typeof parsed.first_name === 'string') user.first_name = parsed.first_name;
    if (typeof parsed.username === 'string') user.username = parsed.username;
    return { ok: true, user };
  } catch {
    return { ok: true };
  }
}
