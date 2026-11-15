// Google Wallet settings, from the environment. Without them the whole Google
// Wallet integration stays off: no button, no sync, no messages.
//
//   GOOGLE_WALLET_ISSUER_ID          the Issuer ID from the Google Pay & Wallet Console
//   GOOGLE_WALLET_SERVICE_ACCOUNT    the service account's JSON key, base64-encoded
//                                    (one line, so it fits in .env)
//   GOOGLE_WALLET_API_BASE           optional; only to point tests at a fake API
//   GOOGLE_WALLET_TOKEN_URL          optional; the same

export interface GoogleWalletConfig {
  issuerId: string;
  clientEmail: string;
  privateKey: string;
  apiBase: string;
  tokenUrl: string;
}

export const DEFAULT_API_BASE = 'https://walletobjects.googleapis.com/walletobjects/v1';
export const DEFAULT_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const readGoogleWalletConfig = (
  env: Record<string, string | undefined> = process.env,
): GoogleWalletConfig | null => {
  const issuerId = env.GOOGLE_WALLET_ISSUER_ID?.trim();
  const encoded = env.GOOGLE_WALLET_SERVICE_ACCOUNT?.trim();
  if (!issuerId || !/^\d{6,25}$/.test(issuerId) || !encoded) return null;
  try {
    const key = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as Record<
      string,
      unknown
    >;
    const clientEmail = typeof key.client_email === 'string' ? key.client_email : '';
    const privateKey = typeof key.private_key === 'string' ? key.private_key : '';
    if (!clientEmail || !privateKey.includes('PRIVATE KEY')) return null;
    return {
      issuerId,
      clientEmail,
      privateKey,
      apiBase: env.GOOGLE_WALLET_API_BASE?.trim() || DEFAULT_API_BASE,
      tokenUrl: env.GOOGLE_WALLET_TOKEN_URL?.trim() || DEFAULT_TOKEN_URL,
    };
  } catch {
    return null;
  }
};

export const googleWalletEnabled = (): boolean => readGoogleWalletConfig() !== null;
