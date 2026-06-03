import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3001', 'labor.uz', '*.labor.uz'] },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'labor.uz' },
      { protocol: 'http', hostname: 'backend' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 't.me' },
      { protocol: 'https', hostname: '**.telegram.org' },
      { protocol: 'https', hostname: 'fimgs.net' },
      { protocol: 'https', hostname: 'www.fragrantica.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/tg/:path*',
        headers: [
          // Telegram WebApp must allow framing inside Telegram
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://telegram.org https://*.telegram.org https://web.telegram.org" },
        ],
      },
    ];
  },
};

// Sentry wraps the fully-composed config (next-intl already applied). Source-map
// upload runs at build only when SENTRY_AUTH_TOKEN/org/project are present;
// absent in dev → upload is skipped and the build still succeeds (graceful
// degrade, same contract as the runtime DSN guard).
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
