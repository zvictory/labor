// requires dependency: minio
//
// S3/MinIO object storage for Labor Parfum product imagery, ported by reference
// from bebio (lib/minio.ts) but trimmed to the primitives the ETL + app need.
// No sharp/resize here — the ETL streams already-processed bytes and calls
// putObject() with an explicit key + content-type.
//
// Env (S3_* names match apps/store/.env.example; MINIO_* accepted as fallback):
//   S3_ENDPOINT      MinIO/S3 endpoint, e.g. http://localhost:9000
//   S3_PORT          optional explicit port (else derived from endpoint URL)
//   S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY
//   S3_BUCKET        bucket name
//   S3_PUBLIC_URL    public base used to build object URLs, e.g.
//                    http://localhost:9000/labor-images
//   S3_USE_SSL       'true'/'false'; else inferred from endpoint protocol

import * as Minio from 'minio';

function env(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v !== undefined && v !== '') return v;
  }
  return undefined;
}

function resolveConnection(): { endPoint: string; port: number; useSSL: boolean } {
  const rawEndpoint = env('S3_ENDPOINT', 'MINIO_ENDPOINT') ?? 'localhost';
  const hasProtocol = /^https?:\/\//i.test(rawEndpoint);
  const url = new URL(hasProtocol ? rawEndpoint : `http://${rawEndpoint}`);

  const sslEnv = env('S3_USE_SSL', 'MINIO_USE_SSL');
  const useSSL = sslEnv !== undefined ? sslEnv === 'true' : url.protocol === 'https:';

  const portEnv = env('S3_PORT', 'MINIO_PORT');
  const port = Number(portEnv ?? url.port ?? (useSSL ? 443 : 9000)) || (useSSL ? 443 : 9000);

  return { endPoint: url.hostname, port, useSSL };
}

export const BUCKET = env('S3_BUCKET', 'MINIO_BUCKET', 'MINIO_BUCKET_NAME') ?? 'labor-images';

// Public base URL used to construct object URLs returned to callers. Falls back
// to deriving from the endpoint + bucket if S3_PUBLIC_URL is unset.
function resolvePublicBase(): string {
  const explicit = env('S3_PUBLIC_URL', 'MINIO_PUBLIC_URL');
  if (explicit) return explicit.replace(/\/$/, '');
  const { endPoint, port, useSSL } = resolveConnection();
  const scheme = useSSL ? 'https' : 'http';
  const hostPort =
    (useSSL && port === 443) || (!useSSL && port === 80) ? endPoint : `${endPoint}:${port}`;
  return `${scheme}://${hostPort}/${BUCKET}`;
}

export const PUBLIC_BASE_URL = resolvePublicBase();

// Singleton MinIO client (cached on globalThis to survive Next.js HMR).
const globalForMinio = globalThis as unknown as { minioClient?: Minio.Client };

export const minioClient: Minio.Client =
  globalForMinio.minioClient ??
  new Minio.Client({
    ...resolveConnection(),
    accessKey: env('S3_ACCESS_KEY_ID', 'MINIO_ACCESS_KEY') ?? 'minioadmin',
    secretKey: env('S3_SECRET_ACCESS_KEY', 'MINIO_SECRET_KEY') ?? 'minioadmin',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForMinio.minioClient = minioClient;
}

// Ensure the bucket exists and is publicly readable (images must be open).
let bucketReady = false;

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;

  const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(BUCKET);
  }

  const policy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${BUCKET}/*`],
      },
    ],
  });
  await minioClient.setBucketPolicy(BUCKET, policy).catch((err: unknown) => {
    // Non-fatal: some S3 backends manage policy externally.
    console.warn('[storage] setBucketPolicy skipped:', err);
  });

  bucketReady = true;
}

/// Build the public URL for a stored object key (no I/O).
export function getObjectUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, '');
  return `${PUBLIC_BASE_URL}/${cleanKey}`;
}

/// Upload raw bytes under `key` and return the public URL.
///
/// EXACT signature the ETL agent depends on — do not change:
///   putObject(key: string, body: Buffer, contentType: string): Promise<string>
export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  await ensureBucket();
  const objectName = key.replace(/^\/+/, '');
  await minioClient.putObject(BUCKET, objectName, body, body.length, {
    'Content-Type': contentType,
  });
  return getObjectUrl(objectName);
}

/// Remove an object by key. Idempotent (no error if absent on most backends).
export async function removeObject(key: string): Promise<void> {
  await minioClient.removeObject(BUCKET, key.replace(/^\/+/, ''));
}
