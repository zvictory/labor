import path from 'path';
import { fileURLToPath } from 'url';
import createNextIntlPlugin from 'next-intl/plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Local dev hosts
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      // MinIO / S3-compatible object storage (dev: localhost:9000)
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '9000' },
      // Compose-internal MinIO hostname for local catalog image optimization.
      { protocol: 'http', hostname: 'minio', port: '9000' },
      // Docker Desktop host gateway; lets the store container optimize local
      // MinIO images that are published on the development host.
      { protocol: 'http', hostname: 'host.docker.internal', port: '9000' },
      { protocol: 'http', hostname: 'minio' },
      { protocol: 'http', hostname: 'minio', port: '9000' },
      // Fragrantica CDN images & icons
      { protocol: 'https', hostname: 'fimgs.net' },
      { protocol: 'https', hostname: '**.fimgs.net' },
      // Production domain images
      { protocol: 'https', hostname: 'laborparfum.com' },
      { protocol: 'https', hostname: '**.laborparfum.com' },
      // Telegram (avatars, t.me links)
      { protocol: 'https', hostname: 't.me' },
      { protocol: 'https', hostname: '**.telegram.org' },
      // Fragrantica note icons
      { protocol: 'https', hostname: 'fimgs.net' },
      { protocol: 'https', hostname: '**.fimgs.net' },
      // Production image hosts
      { protocol: 'https', hostname: 'labor.uz' },
      { protocol: 'https', hostname: '**.labor.uz' },
      { protocol: 'https', hostname: 'laborparfum.com' },
      { protocol: 'https', hostname: '**.laborparfum.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://telegram.org https://*.telegram.org https://web.telegram.org",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/:locale/tg',
        destination: '/:locale',
      },
      {
        source: '/:locale/tg/:path*',
        destination: '/:locale/:path*',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
