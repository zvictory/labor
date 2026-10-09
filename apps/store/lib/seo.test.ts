import { describe, expect, it } from 'vitest';

import {
  SITE_URL,
  absoluteUrl,
  jsonLdScript,
  localeAlternates,
  pageMetadata,
  productJsonLd,
} from './seo';

describe('absoluteUrl', () => {
  it('prefixes a path with the site origin', () => {
    expect(absoluteUrl('/ru/catalog')).toBe(`${SITE_URL}/ru/catalog`);
    expect(absoluteUrl('notes/x.jpg')).toBe(`${SITE_URL}/notes/x.jpg`);
  });

  it('leaves an absolute URL alone', () => {
    expect(absoluteUrl('https://fimgs.net/a.jpg')).toBe('https://fimgs.net/a.jpg');
  });
});

describe('localeAlternates', () => {
  it('gives the canonical for the current locale and a sibling per locale', () => {
    const alt = localeAlternates('uz', '/catalog');
    expect(alt.canonical).toBe(`${SITE_URL}/uz/catalog`);
    expect(alt.languages).toEqual({
      ru: `${SITE_URL}/ru/catalog`,
      en: `${SITE_URL}/en/catalog`,
      uz: `${SITE_URL}/uz/catalog`,
      'x-default': `${SITE_URL}/ru/catalog`,
    });
  });

  it('handles the home page', () => {
    expect(localeAlternates('ru', '').canonical).toBe(`${SITE_URL}/ru`);
  });
});

describe('pageMetadata', () => {
  it('marks a page noindex only when asked', () => {
    const base = { locale: 'ru', path: '/search', title: 'Поиск' };
    expect(pageMetadata(base).robots).toBeUndefined();
    expect(pageMetadata({ ...base, noindex: true }).robots).toEqual({
      index: false,
      follow: true,
    });
  });

  it('sets the Open Graph locale from the page locale', () => {
    const meta = pageMetadata({ locale: 'uz', path: '', title: 'Labor' });
    expect(meta.openGraph).toMatchObject({ locale: 'uz_UZ', url: `${SITE_URL}/uz` });
  });
});

describe('productJsonLd', () => {
  const product = {
    slug: 'aventus',
    name: 'Aventus',
    brand: 'Creed',
    price: 160_000,
    image: '/storage/a.jpg',
    images: [],
  };

  it('describes the offer in UZS with absolute URLs', () => {
    const ld = productJsonLd(product, 'ru', 'Шипровый аромат');
    expect(ld).toMatchObject({
      '@type': 'Product',
      name: 'Aventus',
      url: `${SITE_URL}/ru/product/aventus`,
      image: [`${SITE_URL}/storage/a.jpg`],
      brand: { '@type': 'Brand', name: 'Creed' },
      offers: { '@type': 'Offer', price: 160_000, priceCurrency: 'UZS' },
    });
  });

  it('never carries the imported rating', () => {
    expect(productJsonLd(product, 'ru', '')).not.toHaveProperty('aggregateRating');
  });

  it('omits image when the product has none', () => {
    expect(productJsonLd({ ...product, image: '' }, 'ru', '')).not.toHaveProperty('image');
  });
});

describe('jsonLdScript', () => {
  it('cannot close the script tag', () => {
    expect(jsonLdScript({ name: '</script><b>' })).not.toContain('</script>');
  });
});
