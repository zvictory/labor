import { describe, expect, it } from 'vitest';

import {
  attributionColumns,
  attributionFromParams,
  decodeAttribution,
  describeAttribution,
  encodeAttribution,
} from './attribution';

const params = (q: string) => new URLSearchParams(q);

describe('attributionFromParams', () => {
  it('reads the utm tags and fbclid of a landing URL', () => {
    expect(
      attributionFromParams(
        params(
          'utm_source=Instagram&utm_medium=paid&utm_campaign=2plus1_oct&utm_content=story&fbclid=IwAR0Ab',
        ),
        1000,
      ),
    ).toEqual({
      utmSource: 'instagram',
      utmMedium: 'paid',
      utmCampaign: '2plus1_oct',
      utmContent: 'story',
      fbclid: 'IwAR0Ab',
      at: 1000,
    });
  });

  it('is null for an untagged visit', () => {
    expect(attributionFromParams(params('q=aventus&page=2'))).toBeNull();
    expect(attributionFromParams(params('utm_source=%20%20'))).toBeNull();
  });

  it('drops control characters and bounds the length', () => {
    const a = attributionFromParams(
      params(`utm_campaign=${'x'.repeat(300)}&utm_source=ig%0A%3Cb%3E`),
    );
    expect(a?.utmCampaign).toHaveLength(100);
    expect(a?.utmSource).toBe('ig<b>');
  });
});

describe('cookie round trip', () => {
  it('decodes what it encodes', () => {
    const a = attributionFromParams(params('utm_source=telegram'), 5)!;
    expect(decodeAttribution(encodeAttribution(a))).toEqual(a);
  });

  it('is null for anything malformed', () => {
    expect(decodeAttribution(undefined)).toBeNull();
    expect(decodeAttribution('not json')).toBeNull();
    expect(decodeAttribution('{"utmSource":"x"}')).toBeNull();
  });
});

describe('describeAttribution', () => {
  it('joins the tags that are set', () => {
    const a = attributionFromParams(params('utm_source=instagram&utm_campaign=bespoke'), 1)!;
    expect(describeAttribution(a)).toBe('instagram / bespoke');
  });

  it('names an untagged Meta ad click, and nothing for a direct visit', () => {
    expect(
      describeAttribution(attributionColumns(attributionFromParams(params('fbclid=abc')))),
    ).toBe('meta (fbclid)');
    expect(describeAttribution(attributionColumns(null))).toBeNull();
  });
});
