import formats from './separate-product-formats.json';

export interface PackageSize {
  amount: number;
  unit: 'ml' | 'g';
}

interface SeparateFormat {
  size?: PackageSize;
  inspiredBy?: string;
  copiedProfile?: boolean;
}

const separateFormats: Readonly<Record<string, SeparateFormat>> = formats as Record<
  string,
  SeparateFormat
>;

// Add only source-verified sizes of the same brand, formula and concentration.
// The first slug is the preferred listing. Every slug retains its own product ID.
export const VOLUME_GROUPS: readonly (readonly [string, ...string[]])[] = [
  ['my-way', 'my-way-50-ml'],
];

export const getSeparateFormat = (slug: string): SeparateFormat | undefined =>
  separateFormats[slug];

export const separateFormatSlugs = Object.keys(separateFormats);
export const copiedProfileSlugs = separateFormatSlugs.filter(
  (slug) => separateFormats[slug]?.copiedProfile,
);

export const relatedFormatSlugs = (slug: string): string[] =>
  separateFormatSlugs.filter((candidate) => separateFormats[candidate]?.inspiredBy === slug);

export const volumeGroup = (slug: string) => VOLUME_GROUPS.find((group) => group.includes(slug));
export const listingSlug = (slug: string): string => volumeGroup(slug)?.[0] ?? slug;

export function collapseVolumeListings<T extends { slug: string }>(
  ordered: readonly T[],
  groups = VOLUME_GROUPS,
): T[] {
  const matches = new Map(ordered.map((row) => [row.slug, row]));
  const groupsBySlug = new Map(
    groups.flatMap((group) => group.map((slug) => [slug, group] as const)),
  );
  return ordered.filter((row) => {
    const group = groupsBySlug.get(row.slug);
    return !group || group.find((slug) => matches.has(slug)) === row.slug;
  });
}
