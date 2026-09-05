// `uzc` was Uzbek written in Cyrillic, a fourth locale the storefront no longer
// carries. Links to it still exist, so they are sent to the Latin Uzbek pages
// rather than dropped.
//
// ru and uz were also redirected here — to /en — for as long as the storefront
// ran on a single locale. They are real locales again, so they are no longer
// listed: a redirect for a locale that exists would swallow it.
const legacyLocalePrefix = /^\/uzc(?=\/|$)/;

export const getLegacyLocaleRedirect = (pathname: string, search: string): string | null => {
  if (!legacyLocalePrefix.test(pathname)) return null;

  return `/uz${pathname.replace(legacyLocalePrefix, '') || ''}${search}`;
};
