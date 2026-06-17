import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
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
      { protocol: 'http', hostname: 'minio' },
      { protocol: 'http', hostname: 'minio', port: '9000' },
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
};

export default withNextIntl(nextConfig);
