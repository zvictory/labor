// The Google Wallet REST API (walletobjects/v1), signed in as the service
// account. Tokens are cached until a minute before they expire.

import { signJwt } from '@/lib/wallet/google/jwt';
import type { GoogleWalletConfig } from '@/lib/wallet/google/config';

const SCOPE = 'https://www.googleapis.com/auth/wallet_object.issuer';

export class GoogleWalletError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Google Wallet API ${status}: ${body.slice(0, 300)}`);
    this.name = 'GoogleWalletError';
  }
  get quotaExceeded(): boolean {
    return this.status === 429 || /quota/i.test(this.body);
  }
}

let cached: { token: string; until: number; key: string } | null = null;

const accessToken = async (cfg: GoogleWalletConfig, now = Date.now()): Promise<string> => {
  if (cached && cached.key === cfg.clientEmail && cached.until > now) return cached.token;
  const iat = Math.floor(now / 1000);
  const assertion = signJwt(
    { iss: cfg.clientEmail, scope: SCOPE, aud: cfg.tokenUrl, iat, exp: iat + 3600 },
    cfg.privateKey,
  );
  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new GoogleWalletError(res.status, text);
  const data = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new GoogleWalletError(res.status, text);
  cached = {
    token: data.access_token,
    until: now + ((data.expires_in ?? 3600) - 60) * 1000,
    key: cfg.clientEmail,
  };
  return data.access_token;
};

/** Forget the cached token (tests). */
export const resetGoogleToken = (): void => {
  cached = null;
};

const call = async <T>(
  cfg: GoogleWalletConfig,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<T | null> => {
  const token = await accessToken(cfg);
  const res = await fetch(`${cfg.apiBase}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 404 && method === 'GET') return null;
  const text = await res.text();
  if (!res.ok) throw new GoogleWalletError(res.status, text);
  return (text ? JSON.parse(text) : {}) as T;
};

const enc = encodeURIComponent;

/** Create the class, or bring an existing one up to date. */
export const upsertClass = async (cfg: GoogleWalletConfig, cls: { id: string }): Promise<void> => {
  const existing = await call(cfg, 'GET', `/loyaltyClass/${enc(cls.id)}`);
  if (existing) await call(cfg, 'PATCH', `/loyaltyClass/${enc(cls.id)}`, cls);
  else await call(cfg, 'POST', '/loyaltyClass', cls);
};

export interface WalletObjectState {
  hasUsers?: boolean;
}

/** Create the member's object if it does not exist yet; returns what Google holds. */
export const ensureObject = async (
  cfg: GoogleWalletConfig,
  obj: { id: string },
): Promise<WalletObjectState> => {
  const existing = await call<WalletObjectState>(cfg, 'GET', `/loyaltyObject/${enc(obj.id)}`);
  if (existing) return existing;
  return (await call<WalletObjectState>(cfg, 'POST', '/loyaltyObject', obj)) ?? {};
};

/**
 * Update the fields a sync changes. With `notify`, Google may show its own
 * "pass updated" notification for the fields on its allowlist (the balance).
 */
export const patchObject = async (
  cfg: GoogleWalletConfig,
  objectId: string,
  fields: Record<string, unknown>,
  notify: boolean,
): Promise<WalletObjectState> =>
  (await call<WalletObjectState>(cfg, 'PATCH', `/loyaltyObject/${enc(objectId)}`, {
    ...fields,
    notifyPreference: notify ? 'NOTIFY' : 'DO_NOT_NOTIFY',
  })) ?? {};

/** A message on the back of one member's card that rings their phone. */
export const addObjectMessage = async (
  cfg: GoogleWalletConfig,
  objectId: string,
  message: unknown,
): Promise<void> => {
  await call(cfg, 'POST', `/loyaltyObject/${enc(objectId)}/addMessage`, message);
};
