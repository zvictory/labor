export type TaxonomyMediaKind = 'brands' | 'notes';

export interface TaxonomyMediaFailure {
  kind: TaxonomyMediaKind;
  slug: string;
  url: string;
  error: string;
}

interface TaxonomyMediaDependencies {
  fetchMedia: (url: string) => Promise<Response>;
  uploadMedia: (key: string, body: Buffer, contentType: string) => Promise<string>;
}

export class TaxonomyMediaMigrationError extends Error {
  constructor(
    public readonly failure: TaxonomyMediaFailure,
    options?: ErrorOptions,
  ) {
    super(failure.error, options);
    this.name = 'TaxonomyMediaMigrationError';
  }
}

const EXTENSION_BY_CONTENT_TYPE: Readonly<Record<string, string>> = {
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
};

function getUrlExtension(sourceUrl: string): string | undefined {
  let pathname = sourceUrl;
  try {
    pathname = new URL(sourceUrl).pathname;
  } catch {
    pathname = sourceUrl.split(/[?#]/, 1)[0] ?? sourceUrl;
  }

  const match = pathname.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase();
}

export function getMediaExtension(
  contentType: string | null | undefined,
  sourceUrl: string,
): string {
  const normalizedContentType = contentType?.split(';', 1)[0]?.trim().toLowerCase();
  return (
    (normalizedContentType ? EXTENSION_BY_CONTENT_TYPE[normalizedContentType] : undefined) ??
    getUrlExtension(sourceUrl) ??
    'bin'
  );
}

export function buildTaxonomyMediaKey(
  kind: TaxonomyMediaKind,
  slug: string,
  extension: string,
): string {
  return `taxonomy/${kind}/${slug}.${extension.replace(/^\.+/, '').toLowerCase()}`;
}

export function getPublicObjectUrl(publicPrefix: string, key: string): string {
  return `${publicPrefix.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
}

export function validatePublicUrlPrefix(
  values: ReadonlyArray<string | null>,
  publicPrefix: string,
): { targetNonEmpty: number; targetWithPrefix: number; match: boolean } {
  const nonEmptyValues = values.filter((value): value is string => Boolean(value?.trim()));
  const objectPrefix = getPublicObjectUrl(publicPrefix, '');
  const targetWithPrefix = nonEmptyValues.filter((value) => value.startsWith(objectPrefix)).length;

  return {
    targetNonEmpty: nonEmptyValues.length,
    targetWithPrefix,
    match: targetWithPrefix === nonEmptyValues.length,
  };
}

async function uploadWithStorage(key: string, body: Buffer, contentType: string): Promise<string> {
  const { putObject } = await import('@/lib/storage');
  return putObject(key, body, contentType);
}

async function fetchWithRetry(
  fetchMedia: TaxonomyMediaDependencies['fetchMedia'],
  sourceUrl: string,
): Promise<Response> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchMedia(sourceUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
      }
      return response;
    } catch (error: unknown) {
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 100));
    }
  }

  throw new Error('Taxonomy media fetch exhausted without a response');
}

export async function migrateTaxonomyMedia(options: {
  kind: TaxonomyMediaKind;
  slug: string;
  sourceUrl: string;
  migrateBlobs: boolean;
  dependencies?: TaxonomyMediaDependencies;
}): Promise<string> {
  const { kind, slug, sourceUrl, migrateBlobs, dependencies } = options;
  if (!migrateBlobs) return sourceUrl;

  const fetchMedia = dependencies?.fetchMedia ?? fetch;
  const uploadMedia = dependencies?.uploadMedia ?? uploadWithStorage;

  try {
    const response = await fetchWithRetry(fetchMedia, sourceUrl);

    const contentType = response.headers.get('content-type')?.trim() || 'application/octet-stream';
    const extension = getMediaExtension(contentType, sourceUrl);
    const key = buildTaxonomyMediaKey(kind, slug, extension);
    return await uploadMedia(key, Buffer.from(await response.arrayBuffer()), contentType);
  } catch (error: unknown) {
    if (error instanceof TaxonomyMediaMigrationError) throw error;
    throw new TaxonomyMediaMigrationError(
      {
        kind,
        slug,
        url: sourceUrl,
        error: error instanceof Error ? error.message : String(error),
      },
      { cause: error },
    );
  }
}

export function reportTaxonomyMediaFailures(failures: readonly TaxonomyMediaFailure[]): void {
  if (failures.length === 0) return;

  console.error(`[taxonomy-media] ${failures.length} media migration failure(s):`);
  for (const failure of failures) {
    console.error(`  [${failure.kind}] ${failure.slug} ${failure.url}: ${failure.error}`);
  }
  throw new Error(`[taxonomy-media] ${failures.length} media migration failure(s)`);
}
