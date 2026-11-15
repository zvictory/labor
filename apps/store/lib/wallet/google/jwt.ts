// RS256 JSON Web Tokens signed with the service account's key, for the two
// places Google Wallet wants one: the "Add to Google Wallet" link and the
// OAuth token request. Node's own crypto; no library.

import { createSign } from 'node:crypto';

const base64url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export const signJwt = (claims: Record<string, unknown>, privateKey: string): string => {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(claims));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${body}`);
  return `${header}.${body}.${base64url(signer.sign(privateKey))}`;
};

/** The two halves of a token, decoded; for tests and logs. Does not verify. */
export const decodeJwt = (token: string): { header: unknown; claims: Record<string, unknown> } => {
  const [h, c] = token.split('.');
  const decode = (part: string | undefined) =>
    JSON.parse(
      Buffer.from((part ?? '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    );
  return { header: decode(h), claims: decode(c) as Record<string, unknown> };
};
