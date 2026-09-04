import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { locales, defaultLocale } from '@/i18n/config';
import { getLegacyLocaleRedirect } from '@/i18n/legacy-locale-redirect';

const handleI18n = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: false,
});

export default function middleware(request: NextRequest) {
  const redirectPath = getLegacyLocaleRedirect(request.nextUrl.pathname, request.nextUrl.search);

  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return handleI18n(request);
}

export const config = {
  matcher: [
    '/(ru|uz|uzc)(/.*)?',
    '/((?!api|_next|_vercel|favicon.ico|robots.txt|sitemap.xml|fonts|.*\\..*).*)',
  ],
};
