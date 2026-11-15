import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

// Behind nginx the app sees its own address; the redirects must not use it.
vi.mock('@/lib/seo', () => ({ SITE_URL: 'https://laborparfum.com' }));
vi.mock('@/lib/auth/session', () => ({ getCurrentUser: async () => null }));
vi.mock('@/lib/loyalty/loyalty', () => ({ ensureAccount: vi.fn() }));
vi.mock('@/lib/wallet/google/sync', () => ({ googleSaveUrl: vi.fn() }));

const { GET } = await import('./route');

describe('GET /api/wallet/google/save', () => {
  it('sends a guest to the public login page, not to the internal address', async () => {
    const res = await GET(
      new NextRequest('http://localhost:3002/api/wallet/google/save?locale=uz'),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://laborparfum.com/uz/account/login');
  });
});
