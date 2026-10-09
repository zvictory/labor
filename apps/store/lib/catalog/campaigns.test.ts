import { describe, expect, it } from 'vitest';

import { liveCampaignWhere, safeLinkUrl } from './campaigns';

describe('safeLinkUrl', () => {
  it.each([
    ['https://instagram.com/labor', 'https://instagram.com/labor'],
    ['  /ru/catalog?family=woody ', '/ru/catalog?family=woody'],
  ])('keeps %s', (raw, expected) => {
    expect(safeLinkUrl(raw)).toBe(expected);
  });

  it.each([null, '', 'javascript:alert(1)', 'data:text/html,x', '//evil.example', 'ru/catalog'])(
    'drops %s',
    (raw) => {
      expect(safeLinkUrl(raw)).toBeNull();
    },
  );
});

describe('liveCampaignWhere', () => {
  it('asks for switched-on campaigns whose dates contain now', () => {
    const now = new Date('2026-10-10T00:00:00Z');
    expect(liveCampaignWhere(now)).toEqual({
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    });
  });
});
