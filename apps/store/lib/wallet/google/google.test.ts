import { generateKeyPairSync, createVerify } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readGoogleWalletConfig } from '@/lib/wallet/google/config';
import { decodeJwt, signJwt } from '@/lib/wallet/google/jwt';
import {
  buildLoyaltyClass,
  buildLoyaltyObject,
  buildMessage,
  objectPatch,
  saveLinkClaims,
} from '@/lib/wallet/google/pass';
import { canNotify } from '@/lib/wallet/quota';
import {
  addObjectMessage,
  patchObject,
  resetGoogleToken,
  upsertClass,
} from '@/lib/wallet/google/client';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const serviceAccount = {
  client_email: 'wallet@labor.iam.gserviceaccount.com',
  private_key: privateKey,
};
const env = {
  GOOGLE_WALLET_ISSUER_ID: '3388000000012345678',
  GOOGLE_WALLET_SERVICE_ACCOUNT: Buffer.from(JSON.stringify(serviceAccount)).toString('base64'),
  GOOGLE_WALLET_API_BASE: 'https://wallet.test/v1',
  GOOGLE_WALLET_TOKEN_URL: 'https://wallet.test/token',
};

describe('readGoogleWalletConfig', () => {
  it('reads the issuer and the base64 service account key', () => {
    const cfg = readGoogleWalletConfig(env);
    expect(cfg).toMatchObject({
      issuerId: '3388000000012345678',
      clientEmail: serviceAccount.client_email,
    });
    expect(cfg?.privateKey).toContain('PRIVATE KEY');
  });

  it('is off when anything is missing or malformed', () => {
    expect(readGoogleWalletConfig({})).toBeNull();
    expect(readGoogleWalletConfig({ ...env, GOOGLE_WALLET_ISSUER_ID: 'abc' })).toBeNull();
    expect(
      readGoogleWalletConfig({ ...env, GOOGLE_WALLET_SERVICE_ACCOUNT: 'not-base64-json' }),
    ).toBeNull();
  });
});

describe('signJwt', () => {
  it('signs RS256 tokens that the public key verifies', () => {
    const token = signJwt({ iss: 'a', aud: 'google' }, privateKey);
    const [h, c, sig] = token.split('.');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${h}.${c}`);
    expect(
      verifier.verify(publicKey, Buffer.from(sig!.replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
    ).toBe(true);
    expect(decodeJwt(token)).toEqual({
      header: { alg: 'RS256', typ: 'JWT' },
      claims: { iss: 'a', aud: 'google' },
    });
  });
});

describe('pass shapes', () => {
  const member = {
    cardNumber: '48217730',
    name: 'Мадина',
    tier: 'silver' as const,
    available: 52_800,
    expiringSoon: { amount: 3_000, expiresAt: new Date('2026-12-01T00:00:00Z') },
  };

  it('builds the class with the logo and geofences only for branches with coordinates', () => {
    const cls = buildLoyaltyClass({
      issuerId: '33',
      siteUrl: 'https://laborparfum.com',
      logoUrl: 'https://laborparfum.com/wallet/labor-logo.png',
      branches: [{ latitude: 41.3, longitude: 69.27 }],
    });
    expect(cls).toMatchObject({
      id: '33.labor_loyalty',
      programName: 'Labor',
      reviewStatus: 'UNDER_REVIEW',
      countryCode: 'UZ',
      programLogo: { sourceUri: { uri: 'https://laborparfum.com/wallet/labor-logo.png' } },
      merchantLocations: [{ latitude: 41.3, longitude: 69.27 }],
    });
    expect(
      'merchantLocations' in
        buildLoyaltyClass({ issuerId: '33', siteUrl: 'x', logoUrl: 'y', branches: [] }),
    ).toBe(false);
  });

  it('builds a member object: balance in UZS, tier, QR of the card number, expiry note', () => {
    const obj = buildLoyaltyObject({ issuerId: '33', siteUrl: 'https://laborparfum.com', member });
    expect(obj.id).toBe('33.member_48217730');
    expect(obj.classId).toBe('33.labor_loyalty');
    expect(obj.accountId).toBe('4821 7730');
    expect(obj.loyaltyPoints.balance).toEqual({
      money: { micros: '52800000000', currencyCode: 'UZS' },
    });
    expect(obj.secondaryLoyaltyPoints.balance).toEqual({ string: 'Silver' });
    expect(obj.barcode).toEqual({ type: 'QR_CODE', value: '48217730', alternateText: '4821 7730' });
    expect(obj.textModulesData).toHaveLength(1);
    expect(obj.linksModuleData.uris[0]?.uri).toContain('utm_source=wallet');
    expect(Object.keys(objectPatch(obj)).sort()).toEqual(
      ['accountName', 'loyaltyPoints', 'secondaryLoyaltyPoints', 'textModulesData'].sort(),
    );
  });

  it('makes save-link claims for the existing object, with the site as origin', () => {
    const claims = saveLinkClaims({
      clientEmail: 'sa@x',
      issuerId: '33',
      cardNumber: '48217730',
      origins: ['https://laborparfum.com'],
      now: new Date('2026-11-16T00:00:00Z'),
    });
    expect(claims).toEqual({
      iss: 'sa@x',
      aud: 'google',
      typ: 'savetowallet',
      iat: 1794787200,
      origins: ['https://laborparfum.com'],
      payload: { loyaltyObjects: [{ id: '33.member_48217730' }] },
    });
  });

  it('makes a message that notifies', () => {
    expect(
      buildMessage({
        id: 'm1',
        header: 'Новинка',
        body: 'Пробник 2 мл',
        link: 'https://laborparfum.com/x',
      }),
    ).toEqual({
      message: {
        id: 'm1',
        header: 'Новинка',
        body: 'Пробник 2 мл\nhttps://laborparfum.com/x',
        messageType: 'TEXT_AND_NOTIFY',
      },
    });
  });
});

describe('canNotify', () => {
  const now = new Date('2026-11-16T12:00:00Z');
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000);

  it('allows three a day in all', () => {
    const two = [
      { kind: 'earn', createdAt: ago(1) },
      { kind: 'earn', createdAt: ago(2) },
    ];
    expect(canNotify(two, 'earn', now)).toBe(true);
    expect(canNotify([...two, { kind: 'earn', createdAt: ago(3) }], 'earn', now)).toBe(false);
    expect(canNotify([...two, { kind: 'earn', createdAt: ago(30) }], 'earn', now)).toBe(true);
  });

  it('keeps the last of the three for the member’s own news', () => {
    const two = [
      { kind: 'earn', createdAt: ago(1) },
      { kind: 'promo', createdAt: ago(200) },
      { kind: 'personal', createdAt: ago(2) },
    ];
    expect(canNotify(two, 'personal', now)).toBe(false);
    expect(canNotify(two, 'birthday', now)).toBe(true);
  });

  it('allows one promotional message a week', () => {
    expect(canNotify([{ kind: 'promo', createdAt: ago(24 * 6) }], 'promo', now)).toBe(false);
    expect(canNotify([{ kind: 'promo', createdAt: ago(24 * 8) }], 'promo', now)).toBe(true);
    expect(canNotify([], 'promo', now)).toBe(true);
  });
});

describe('client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetGoogleToken();
  });

  const cfg = readGoogleWalletConfig(env)!;

  const fakeGoogle = (
    handler: (method: string, url: string, body: unknown) => [number, unknown],
  ) => {
    const calls: { method: string; url: string; body: unknown; auth: string | null }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit = {}) => {
        const method = init.method ?? 'GET';
        if (url === env.GOOGLE_WALLET_TOKEN_URL) {
          const params = new URLSearchParams(String(init.body));
          const { claims } = decodeJwt(params.get('assertion') ?? '');
          expect(claims).toMatchObject({
            iss: serviceAccount.client_email,
            scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
          });
          return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), {
            status: 200,
          });
        }
        const headers = new Headers(init.headers);
        const body = init.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ method, url, body, auth: headers.get('authorization') });
        const [status, out] = handler(method, url, body);
        return new Response(out === undefined ? '' : JSON.stringify(out), { status });
      }),
    );
    return calls;
  };

  it('inserts the class when Google does not have it, and patches it when it does', async () => {
    const calls = fakeGoogle((method) =>
      method === 'GET' ? [404, { error: 'not found' }] : [200, {}],
    );
    await upsertClass(cfg, { id: '33.labor_loyalty' });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'GET https://wallet.test/v1/loyaltyClass/33.labor_loyalty',
      'POST https://wallet.test/v1/loyaltyClass',
    ]);
    expect(calls[0]?.auth).toBe('Bearer tok');

    const again = fakeGoogle((method) =>
      method === 'GET' ? [200, { id: '33.labor_loyalty' }] : [200, {}],
    );
    await upsertClass(cfg, { id: '33.labor_loyalty' });
    expect(again.map((c) => c.method)).toEqual(['GET', 'PATCH']);
  });

  it('patches with the notify preference and reads hasUsers back', async () => {
    const calls = fakeGoogle(() => [200, { hasUsers: true }]);
    const out = await patchObject(cfg, '33.member_1', { loyaltyPoints: {} }, true);
    expect(out.hasUsers).toBe(true);
    expect(calls[0]?.body).toEqual({ loyaltyPoints: {}, notifyPreference: 'NOTIFY' });
  });

  it('reports a quota error on a message', async () => {
    fakeGoogle(() => [429, { error: { message: 'Quota exceeded' } }]);
    await expect(addObjectMessage(cfg, '33.member_1', {})).rejects.toMatchObject({
      quotaExceeded: true,
    });
  });
});
