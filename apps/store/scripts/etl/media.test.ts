import { describe, expect, it } from 'vitest';

import {
  buildTaxonomyMediaKey,
  getMediaExtension,
  getPublicObjectUrl,
  migrateTaxonomyMedia,
  validatePublicUrlPrefix,
} from './media';

describe('taxonomy media helpers', () => {
  it('prefers a supported content type over the source URL extension', () => {
    expect(getMediaExtension('image/jpeg; charset=binary', 'https://old.test/logo.png')).toBe(
      'jpg',
    );
  });

  it('falls back to the source URL extension for an unknown content type', () => {
    expect(getMediaExtension('application/octet-stream', 'https://old.test/icon.webp?size=2')).toBe(
      'webp',
    );
  });

  it('builds deterministic taxonomy keys from the kind, slug, and extension', () => {
    expect(buildTaxonomyMediaKey('brands', 'diptyque', 'jpg')).toBe('taxonomy/brands/diptyque.jpg');
    expect(buildTaxonomyMediaKey('notes', 'rose', '.png')).toBe('taxonomy/notes/rose.png');
  });

  it('joins the configured public prefix and object key exactly once', () => {
    expect(
      getPublicObjectUrl('http://localhost:9000/labor-images/', '/taxonomy/brands/a.jpg'),
    ).toBe('http://localhost:9000/labor-images/taxonomy/brands/a.jpg');
  });

  it('preserves the original source URL when blob migration is disabled', async () => {
    const sourceUrl = 'https://legacy.test/brands/diptyque.svg';
    const failIfCalled = async (): Promise<never> => {
      throw new Error('dependency must not be called');
    };

    await expect(
      migrateTaxonomyMedia({
        kind: 'brands',
        slug: 'diptyque',
        sourceUrl,
        migrateBlobs: false,
        dependencies: {
          fetchMedia: failIfCalled,
          uploadMedia: failIfCalled,
        },
      }),
    ).resolves.toBe(sourceUrl);
  });

  it('fetches and uploads bytes under the deterministic taxonomy key in blob mode', async () => {
    const sourceUrl = 'https://legacy.test/notes/rose.original';
    const bytes = Buffer.from([1, 2, 3, 4]);
    const fetchedUrls: string[] = [];
    const uploads: Array<{ key: string; body: Buffer; contentType: string }> = [];

    const result = await migrateTaxonomyMedia({
      kind: 'notes',
      slug: 'rose',
      sourceUrl,
      migrateBlobs: true,
      dependencies: {
        fetchMedia: async (url) => {
          fetchedUrls.push(url);
          return new Response(bytes, { headers: { 'content-type': 'image/png' } });
        },
        uploadMedia: async (key, body, contentType) => {
          uploads.push({ key, body, contentType });
          return 'http://localhost:9000/labor-images/taxonomy/notes/rose.png';
        },
      },
    });

    expect(fetchedUrls).toEqual([sourceUrl]);
    expect(uploads).toEqual([
      {
        key: 'taxonomy/notes/rose.png',
        body: bytes,
        contentType: 'image/png',
      },
    ]);
    expect(result).toBe('http://localhost:9000/labor-images/taxonomy/notes/rose.png');
  });

  it('retries a transient fetch failure before uploading taxonomy media', async () => {
    let attempts = 0;

    await expect(
      migrateTaxonomyMedia({
        kind: 'brands',
        slug: 'ex-nihilo',
        sourceUrl: 'https://legacy.test/brands/ex-nihilo.jpg',
        migrateBlobs: true,
        dependencies: {
          fetchMedia: async () => {
            attempts += 1;
            if (attempts === 1) throw new TypeError('fetch failed');
            return new Response(Buffer.from([1]), {
              headers: { 'content-type': 'image/jpeg' },
            });
          },
          uploadMedia: async () => 'http://minio:9000/labor-images/taxonomy/brands/ex-nihilo.jpg',
        },
      }),
    ).resolves.toContain('/taxonomy/brands/ex-nihilo.jpg');
    expect(attempts).toBe(2);
  });

  it('preserves taxonomy identity and source URL when fetching fails', async () => {
    const sourceUrl = 'https://legacy.test/brands/broken.jpg';

    await expect(
      migrateTaxonomyMedia({
        kind: 'brands',
        slug: 'broken-brand',
        sourceUrl,
        migrateBlobs: true,
        dependencies: {
          fetchMedia: async () => new Response(null, { status: 503, statusText: 'Unavailable' }),
          uploadMedia: async () => {
            throw new Error('upload must not be called');
          },
        },
      }),
    ).rejects.toMatchObject({
      failure: {
        kind: 'brands',
        slug: 'broken-brand',
        url: sourceUrl,
        error: 'HTTP 503 Unavailable',
      },
    });
  });

  it('reports whether every non-empty target URL uses the configured public prefix', () => {
    expect(
      validatePublicUrlPrefix(
        [
          null,
          '',
          'http://localhost:9000/labor-images/taxonomy/brands/a.jpg',
          'https://legacy.test/notes/rose.png',
        ],
        'http://localhost:9000/labor-images/',
      ),
    ).toEqual({
      targetNonEmpty: 2,
      targetWithPrefix: 1,
      match: false,
    });
  });
});
