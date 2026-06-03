import { describe, it, expect, beforeEach } from 'vitest';
import { parseUtm, persistUtm, readUtm } from './utm';

// Attribution intent these tests lock in:
//  - parseUtm keeps ONLY utm_* keys (campaign tooling appends fbclid, gclid,
//    locale, etc. — those are not attribution and must not be stored).
//  - first-touch is immutable: it credits the campaign that first discovered
//    the user, forever. last-touch credits the most recent click.
//  - a page load with NO utm params (i.e. internal navigation, the common case)
//    must NOT wipe previously-stored attribution. Clobbering here would erase
//    the source on every click after the landing — the bug that makes
//    home-grown UTM tracking silently useless.
describe('parseUtm', () => {
  it('extracts only the five utm_* keys', () => {
    const params = new URLSearchParams(
      'utm_source=instagram&utm_medium=reel&utm_campaign=wk1&utm_term=oud&utm_content=carousel',
    );
    expect(parseUtm(params)).toEqual({
      utm_source: 'instagram',
      utm_medium: 'reel',
      utm_campaign: 'wk1',
      utm_term: 'oud',
      utm_content: 'carousel',
    });
  });

  it('ignores non-utm params and empty values', () => {
    const params = new URLSearchParams('utm_source=instagram&fbclid=abc&utm_campaign=&q=oud');
    expect(parseUtm(params)).toEqual({ utm_source: 'instagram' });
  });
});

describe('persistUtm + readUtm', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null and writes nothing when there are no utm params', () => {
    const result = persistUtm(new URLSearchParams('q=oud&page=2'));
    expect(result).toBeNull();
    expect(readUtm()).toBeNull();
  });

  it('sets first-touch equal to last-touch on the first tagged visit', () => {
    persistUtm(new URLSearchParams('utm_source=instagram&utm_campaign=wk1'));

    expect(readUtm()).toEqual({
      first: { utm_source: 'instagram', utm_campaign: 'wk1' },
      last: { utm_source: 'instagram', utm_campaign: 'wk1' },
    });
  });

  it('keeps first-touch immutable but overwrites last-touch on a later tagged visit', () => {
    persistUtm(new URLSearchParams('utm_source=instagram&utm_campaign=wk1'));
    persistUtm(new URLSearchParams('utm_source=telegram&utm_campaign=wk4'));

    expect(readUtm()).toEqual({
      first: { utm_source: 'instagram', utm_campaign: 'wk1' },
      last: { utm_source: 'telegram', utm_campaign: 'wk4' },
    });
  });

  it('does not clobber stored attribution on an untagged navigation', () => {
    persistUtm(new URLSearchParams('utm_source=instagram&utm_campaign=wk1'));
    const result = persistUtm(new URLSearchParams('q=oud'));

    // untagged load returns the existing record unchanged, leaves storage intact
    expect(result).toEqual({
      first: { utm_source: 'instagram', utm_campaign: 'wk1' },
      last: { utm_source: 'instagram', utm_campaign: 'wk1' },
    });
    expect(readUtm()).toEqual(result);
  });

  it('returns null from readUtm when the stored value is corrupt', () => {
    localStorage.setItem('labor-utm', '{not valid json');
    expect(readUtm()).toBeNull();
  });
});
