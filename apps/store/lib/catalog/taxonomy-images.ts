export { LOGO_FILES, PERFUMER_IMAGES } from './media-manifest';

import { LOGO_FILES, NOTE_ICON_FILES, PERFUMER_IMAGES } from './media-manifest';

export const pickRepresentativeImage = (urls: readonly (string | null)[]): string | undefined =>
  urls.find((url): url is string => Boolean(url));

type ImageFallbackInput = {
  slug: string;
  productImageUrls: readonly (string | null)[];
};

// A brand with no logo used to borrow one of its own bottles, and a note with
// no photograph did the same. The grids then held three different kinds of
// object at once — a wordmark, an ingredient, a product shot — and the bottle
// read as the answer to the wrong question: on /brands it said "this is the
// house", on /notes it said "this is what lemon blossom looks like". Neither
// is true. Returning nothing lets the card fall back to type, which claims
// only what it knows: the name.
export const resolveBrandImage = ({
  slug,
  logoUrl,
}: ImageFallbackInput & { logoUrl?: string | null }): string | undefined =>
  logoUrl || (LOGO_FILES[slug] ? `/brands/${LOGO_FILES[slug]}` : undefined);

export const resolveNoteImage = ({
  slug,
  iconUrl,
}: ImageFallbackInput & { iconUrl?: string | null }): string | undefined =>
  iconUrl || (NOTE_ICON_FILES[slug] ? `/notes/${NOTE_ICON_FILES[slug]}` : undefined);

export const resolvePerfumerImage = ({
  slug,
  productImageUrls,
}: ImageFallbackInput): string | undefined =>
  (PERFUMER_IMAGES[slug] ? `/perfumers/${PERFUMER_IMAGES[slug]}` : undefined) ||
  pickRepresentativeImage(productImageUrls);
