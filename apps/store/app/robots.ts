import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/seo';

// Personal and transactional pages have nothing to rank for and would only
// spend crawl budget. `/tg` is the Telegram mini-app's rewrite of the same
// pages, so crawling it would index every page twice.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/*/admin',
        '/*/account',
        '/*/cart',
        '/*/checkout',
        '/*/orders/',
        '/*/search',
        '/*/tg',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
