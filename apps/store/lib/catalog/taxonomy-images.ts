export { LOGO_FILES, PERFUMER_IMAGES } from './media-manifest';

import { LOGO_FILES, NOTE_ICON_FILES, PERFUMER_IMAGES } from './media-manifest';

export const pickRepresentativeImage = (urls: readonly (string | null)[]): string | undefined =>
  urls.find((url): url is string => Boolean(url));

type ImageFallbackInput = {
  slug: string;
  productImageUrls: readonly (string | null)[];
};

export const resolveBrandImage = ({
  slug,
  logoUrl,
  productImageUrls,
}: ImageFallbackInput & { logoUrl?: string | null }): string | undefined =>
  logoUrl ||
  (LOGO_FILES[slug] ? `/brands/${LOGO_FILES[slug]}` : undefined) ||
  pickRepresentativeImage(productImageUrls);

export const resolveNoteImage = ({
  slug,
  iconUrl,
  productImageUrls,
}: ImageFallbackInput & { iconUrl?: string | null }): string | undefined =>
  iconUrl ||
  (NOTE_ICON_FILES[slug] ? `/notes/${NOTE_ICON_FILES[slug]}` : undefined) ||
  pickRepresentativeImage(productImageUrls);

export const resolvePerfumerImage = ({
  slug,
  productImageUrls,
}: ImageFallbackInput): string | undefined =>
  (PERFUMER_IMAGES[slug] ? `/perfumers/${PERFUMER_IMAGES[slug]}` : undefined) ||
  pickRepresentativeImage(productImageUrls);
