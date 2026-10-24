import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The ids are read when the module loads, so each case stubs the environment
// first and then imports a fresh copy.
const load = async (env: Record<string, string>) => {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('./analytics');
};

type FakeWindow = {
  ym?: ReturnType<typeof vi.fn>;
  gtag?: ReturnType<typeof vi.fn>;
  fbq?: ReturnType<typeof vi.fn>;
};

describe('analytics', () => {
  let win: FakeWindow & { setTimeout: typeof setTimeout };

  beforeEach(() => {
    vi.useFakeTimers();
    win = { setTimeout: ((fn: () => void, ms: number) => setTimeout(fn, ms)) as typeof setTimeout };
    vi.stubGlobal('window', win);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('drops ids that are not the expected shape', async () => {
    const a = await load({
      NEXT_PUBLIC_YANDEX_METRICA_ID: '123"); alert(1); //',
      NEXT_PUBLIC_GA_MEASUREMENT_ID: 'UA-1',
    });
    expect(a.YANDEX_METRICA_ID).toBeNull();
    expect(a.GA_MEASUREMENT_ID).toBeNull();
  });

  it('sends an event to both counters', async () => {
    const a = await load({
      NEXT_PUBLIC_YANDEX_METRICA_ID: '98765432',
      NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-ABC123',
    });
    win.ym = vi.fn();
    win.gtag = vi.fn();

    a.track('begin_checkout', { value: 160000, currency: 'UZS' });

    expect(win.ym).toHaveBeenCalledWith(98765432, 'reachGoal', 'begin_checkout', {
      value: 160000,
      currency: 'UZS',
    });
    expect(win.gtag).toHaveBeenCalledWith('event', 'begin_checkout', {
      value: 160000,
      currency: 'UZS',
    });
  });

  it('waits for a counter that loads after the event', async () => {
    const a = await load({ NEXT_PUBLIC_YANDEX_METRICA_ID: '98765432' });

    a.track('purchase', { transaction_id: 'L-1' });
    const ym = vi.fn();
    win.ym = ym;
    vi.advanceTimersByTime(300);

    expect(ym).toHaveBeenCalledWith(98765432, 'reachGoal', 'purchase', { transaction_id: 'L-1' });
  });

  it('does nothing when no id is configured', async () => {
    const a = await load({});
    win.ym = vi.fn();
    a.track('add_to_cart');
    vi.advanceTimersByTime(10_000);
    expect(win.ym).not.toHaveBeenCalled();
  });

  it('never throws when a counter does', async () => {
    const a = await load({ NEXT_PUBLIC_YANDEX_METRICA_ID: '98765432' });
    win.ym = vi.fn(() => {
      throw new Error('blocked');
    });
    expect(() => a.trackPageView('https://laborparfum.com/ru/catalog')).not.toThrow();
  });

  it('sends Meta its standard event, with the order number as the event id', async () => {
    const a = await load({ NEXT_PUBLIC_META_PIXEL_ID: '1234567890123456' });
    win.fbq = vi.fn();

    a.track('purchase', { transaction_id: 'L-7', value: 320000, currency: 'UZS' });
    a.track('view_item', { item_id: 42, value: 160000, currency: 'UZS' });
    a.track('generate_lead', { source: 'finder' }, { eventId: 'lead-9' });

    expect(win.fbq).toHaveBeenNthCalledWith(
      1,
      'track',
      'Purchase',
      { value: 320000, currency: 'UZS', order_id: 'L-7' },
      { eventID: 'L-7' },
    );
    expect(win.fbq).toHaveBeenNthCalledWith(
      2,
      'track',
      'ViewContent',
      { value: 160000, currency: 'UZS', content_ids: ['42'], content_type: 'product' },
      {},
    );
    expect(win.fbq).toHaveBeenNthCalledWith(
      3,
      'track',
      'Lead',
      { content_category: 'finder' },
      { eventID: 'lead-9' },
    );
  });

  it('counts a client-side navigation as a Meta page view', async () => {
    const a = await load({ NEXT_PUBLIC_META_PIXEL_ID: '1234567890123456' });
    win.fbq = vi.fn();
    a.trackPageView('https://laborparfum.com/ru/catalog');
    expect(win.fbq).toHaveBeenCalledWith('track', 'PageView');
  });

  it('drops a pixel id that is not a number', async () => {
    const a = await load({ NEXT_PUBLIC_META_PIXEL_ID: "1');alert(1)//" });
    expect(a.META_PIXEL_ID).toBeNull();
  });
});
