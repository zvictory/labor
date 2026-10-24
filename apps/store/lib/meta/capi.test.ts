import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_GRAPH_VERSION,
  buildCapiEvent,
  capiConfig,
  clientIpFrom,
  fbcFromClick,
  metaPhone,
  sendCapiEvent,
  type CapiEventInput,
} from './capi';

const sha = (v: string) => createHash('sha256').update(v).digest('hex');

const input: CapiEventInput = {
  eventName: 'Purchase',
  eventId: 'L-20261025-ABCD',
  eventTime: new Date('2026-10-25T10:00:00Z'),
  sourceUrl: 'https://laborparfum.com/uz/checkout',
  phone: '+998 90 123 45 67',
  externalId: '42',
  visitor: {
    clientIp: '203.0.113.7',
    userAgent: 'Mozilla/5.0',
    fbp: 'fb.1.1700000000000.123',
    fbc: null,
  },
  customData: { value: 320000, currency: 'UZS' },
};

describe('buildCapiEvent', () => {
  it('hashes the phone, the user id and the country, and passes the rest as is', () => {
    expect(buildCapiEvent(input)).toEqual({
      event_name: 'Purchase',
      event_time: 1792922400,
      event_id: 'L-20261025-ABCD',
      action_source: 'website',
      event_source_url: 'https://laborparfum.com/uz/checkout',
      user_data: {
        country: [sha('uz')],
        ph: [sha('998901234567')],
        external_id: [sha('42')],
        client_ip_address: '203.0.113.7',
        client_user_agent: 'Mozilla/5.0',
        fbp: 'fb.1.1700000000000.123',
      },
      custom_data: { value: 320000, currency: 'UZS' },
    });
  });

  it('leaves out what is unknown', () => {
    const ev = buildCapiEvent({
      ...input,
      phone: '12',
      externalId: null,
      visitor: { clientIp: null, userAgent: null, fbp: null, fbc: 'fb.1.5.abc' },
    });
    expect(ev.user_data).toEqual({ country: [sha('uz')], fbc: 'fb.1.5.abc' });
  });
});

describe('helpers', () => {
  it('formats a phone the way Meta hashes it', () => {
    expect(metaPhone('90 123-45-67')).toBe('998901234567');
    expect(metaPhone('+7 999 000 00 00')).toBeNull();
  });

  it('builds fbc from a stored ad click', () => {
    expect(fbcFromClick('IwAR0', 1700000000000)).toBe('fb.1.1700000000000.IwAR0');
  });

  it('takes the visitor address nginx put first', () => {
    expect(clientIpFrom('203.0.113.7, 172.18.0.5', '172.18.0.5')).toBe('203.0.113.7');
    expect(clientIpFrom(null, ' 198.51.100.2 ')).toBe('198.51.100.2');
    expect(clientIpFrom(null, null)).toBeNull();
  });
});

describe('capiConfig', () => {
  it('is off without both the pixel id and the token', () => {
    expect(capiConfig({ NEXT_PUBLIC_META_PIXEL_ID: '1234567890' })).toBeNull();
    expect(capiConfig({ META_CAPI_TOKEN: 't' })).toBeNull();
  });

  it('uses the default Graph version unless a valid one is set', () => {
    const env = { NEXT_PUBLIC_META_PIXEL_ID: '1234567890', META_CAPI_TOKEN: 't' };
    expect(capiConfig(env)?.version).toBe(DEFAULT_GRAPH_VERSION);
    expect(capiConfig({ ...env, META_GRAPH_VERSION: 'v26.0' })?.version).toBe('v26.0');
    expect(capiConfig({ ...env, META_GRAPH_VERSION: '../x' })?.version).toBe(DEFAULT_GRAPH_VERSION);
  });
});

describe('sendCapiEvent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const config = {
    pixelId: '1234567890',
    token: 'se cret',
    version: 'v25.0',
    testEventCode: 'TEST1',
  };

  it('posts the event, with the test code while one is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"events_received":1}'));
    vi.stubGlobal('fetch', fetchMock);

    expect(await sendCapiEvent(input, config)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://graph.facebook.com/v25.0/1234567890/events?access_token=se%20cret');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.test_event_code).toBe('TEST1');
    expect(body.data[0].event_id).toBe('L-20261025-ABCD');
  });

  it('reports a failure instead of throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad token', { status: 400 })));
    expect(await sendCapiEvent(input, config)).toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await sendCapiEvent(input, config)).toBe(false);
  });

  it('sends nothing when not configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await sendCapiEvent(input, null)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
