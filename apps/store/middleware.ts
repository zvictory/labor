import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { locales, defaultLocale } from '@/i18n/config';
import { getLegacyLocaleRedirect } from '@/i18n/legacy-locale-redirect';
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_S,
  attributionFromParams,
  encodeAttribution,
} from '@/lib/attribution/attribution';

const handleI18n = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: false,
});

// A visit from a tagged link (an ad, a post, a bio link) replaces the stored
// tags; any other visit leaves them alone. See lib/attribution.
const rememberAttribution = (request: NextRequest, response: NextResponse): NextResponse => {
  const attribution = attributionFromParams(request.nextUrl.searchParams);
  if (attribution) {
    response.cookies.set(ATTRIBUTION_COOKIE, encodeAttribution(attribution), {
      maxAge: ATTRIBUTION_MAX_AGE_S,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
  }
  return response;
};

export default function middleware(request: NextRequest) {
  const redirectPath = getLegacyLocaleRedirect(request.nextUrl.pathname, request.nextUrl.search);

  if (redirectPath) {
    return rememberAttribution(request, NextResponse.redirect(new URL(redirectPath, request.url)));
  }

  return rememberAttribution(request, handleI18n(request));
}

export const config = {
  matcher: [
    '/(ru|uz|uzc)(/.*)?',
    '/((?!api|_next|_vercel|favicon.ico|robots.txt|sitemap.xml|fonts|.*\\..*).*)',
  ],
};
