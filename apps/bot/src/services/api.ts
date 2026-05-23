import { config } from '../config.js';

type Json = Record<string, unknown> | unknown[];

const req = async <T>(method: 'GET' | 'POST', path: string, body?: Json, token?: string): Promise<T> => {
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'access-token': token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`api ${method} ${path} -> ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
};

export const api = {
  ping: () => req<{ status: string }>('GET', '/storefront/account'),
  getCampaign: (slug: string) => req<{ data: { title: string; description: string; ends_at: string } }>('GET', `/storefront/campaigns/${slug}`),
  saveLocale: (telegramId: number, locale: string) =>
    req<{ ok: true }>('POST', '/storefront/auth/telegram/locale', { telegram_id: telegramId, locale }),
};
