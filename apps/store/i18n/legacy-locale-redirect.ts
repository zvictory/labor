const legacyLocalePrefix = /^\/(?:ru|uz|uzc)(?=\/|$)/;

export const getLegacyLocaleRedirect = (pathname: string, search: string): string | null => {
  if (!legacyLocalePrefix.test(pathname)) return null;

  return `/en${pathname.replace(legacyLocalePrefix, '') || ''}${search}`;
};
