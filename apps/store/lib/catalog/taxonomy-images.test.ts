import { describe, expect, it } from 'vitest';

import {
  LOGO_FILES,
  PERFUMER_IMAGES,
  pickRepresentativeImage,
  resolveBrandImage,
  resolveNoteImage,
  resolvePerfumerImage,
} from './taxonomy-images';

describe('pickRepresentativeImage', () => {
  it('returns the first available related product image', () => {
    expect(pickRepresentativeImage([null, '', 'https://images.test/a.webp'])).toBe(
      'https://images.test/a.webp',
    );
  });

  it('returns undefined when related products have no images', () => {
    expect(pickRepresentativeImage([null, ''])).toBeUndefined();
  });
});

describe('taxonomy image resolution', () => {
  it('prioritizes a database brand logo over curated and product images', () => {
    expect(
      resolveBrandImage({
        slug: 'dior',
        logoUrl: 'https://minio.test/dior.svg',
        productImageUrls: ['https://images.test/product.webp'],
      }),
    ).toBe('https://minio.test/dior.svg');
  });

  it('uses the curated brand logo before a product image', () => {
    expect(
      resolveBrandImage({ slug: 'dior', productImageUrls: ['https://images.test/product.webp'] }),
    ).toBe('/brands/dior.svg');
  });

  it('falls back to a representative product image for brands', () => {
    expect(
      resolveBrandImage({
        slug: 'unknown',
        productImageUrls: ['https://images.test/product.webp'],
      }),
    ).toBe('https://images.test/product.webp');
  });

  it('prioritizes a database note icon over curated and product images', () => {
    expect(
      resolveNoteImage({
        slug: 'rose',
        iconUrl: 'https://minio.test/rose.png',
        productImageUrls: ['https://images.test/product.webp'],
      }),
    ).toBe('https://minio.test/rose.png');
  });

  it('uses a curated note icon before a product image', () => {
    expect(
      resolveNoteImage({ slug: 'rose', productImageUrls: ['https://images.test/product.webp'] }),
    ).toBe('/notes/rose.png');
  });

  it('uses a curated perfumer portrait before a product image', () => {
    expect(
      resolvePerfumerImage({
        slug: 'alberto-morillas',
        productImageUrls: ['https://images.test/product.webp'],
      }),
    ).toBe('/perfumers/alberto-morillas.jpg');
  });

  it('includes legacy perfumer aliases in the typed manifest', () => {
    expect(resolvePerfumerImage({ slug: 'aure-lien-guichard', productImageUrls: [] })).toBe(
      '/perfumers/aurelien-guichard.jpg',
    );
    expect(resolvePerfumerImage({ slug: 'c-cile-zarokian', productImageUrls: [] })).toBe(
      '/perfumers/cecile-zarokian.jpg',
    );
    expect(resolvePerfumerImage({ slug: 'j-r-me-epinette', productImageUrls: [] })).toBe(
      '/perfumers/jerome-epinette.jpg',
    );
    expect(
      resolvePerfumerImage({ slug: 'jacques-cavallier-belletrud', productImageUrls: [] }),
    ).toBe('/perfumers/jacques-cavallier.jpg');
  });

  it('exports the curated brand manifest', () => {
    expect(LOGO_FILES['dior']).toBe('dior.svg');
  });
});
