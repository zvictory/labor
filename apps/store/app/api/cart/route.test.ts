import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Reads must never create a cart or set the cookie: several components GET at
// once on a first visit, and each created cart raced the visitor's first add.
const cookieSet = vi.fn();
const cart = { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() };

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: cookieSet }),
}));
vi.mock('@/lib/db', () => ({ db: { cart, cartItem: { findUnique: vi.fn() } } }));
vi.mock('@/lib/auth/session', () => ({ getCurrentUserId: async () => undefined }));

const { GET, PATCH, DELETE } = await import('./route');

beforeEach(() => {
  vi.clearAllMocks();
});

const request = (method: string, body?: unknown) =>
  new NextRequest('http://localhost/api/cart?locale=ru', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  });

describe('/api/cart without a cart cookie', () => {
  it('GET answers an empty cart and creates nothing', async () => {
    const res = await GET(request('GET'));
    expect(await res.json()).toEqual({ items: [], itemCount: 0, subtotal: 0 });
    expect(cart.create).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it('PATCH and DELETE create nothing either', async () => {
    await PATCH(request('PATCH', { itemId: 1, quantity: 2 }));
    await DELETE(request('DELETE', { itemId: 1 }));
    expect(cart.create).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
  });
});
