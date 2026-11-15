import { NOTE_LIBRARY_ASSETS } from './note-library.generated';
import { canonicalNoteSlug } from './note-aliases';

/** Versioned pilot assets; originals remain available for rollback. */
export const NOTE_PILOT_SLUGS = [
  'patchouli',
  'bergamot',
  'vanilla',
  'sandalwood',
  'cedar',
  'vetiver',
  'jasmine',
  'pink-pepper',
  'lemon',
  'rose',
  'tonka-bean',
  'cinnamon',
] as const;

export function noteLaborAsset(slug: string): { src: string; representative: boolean } | undefined {
  const canonical = canonicalNoteSlug(slug);
  const completed = NOTE_LIBRARY_ASSETS[canonical];
  if (completed) return completed;
  return (NOTE_PILOT_SLUGS as readonly string[]).includes(canonical)
    ? { src: `/notes/labor-pilot-v1/${canonical}.webp`, representative: false }
    : undefined;
}

// Compatibility for the shared image resolvers; includes completed library assets.
export function notePilotImage(slug: string): string | undefined {
  return noteLaborAsset(slug)?.src;
}

export function noteRepresentativeLabel(locale: string): string {
  if (locale === 'ru') return 'Образ ноты';
  if (locale === 'uz') return 'Ramziy tasvir';
  return 'Representative image';
}
