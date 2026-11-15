import { describe, expect, it } from 'vitest';
import { NOTE_ALIASES, canonicalNoteSlug, noteSlugVariants } from './note-aliases';

describe('reviewed note aliases', () => {
  it.each(Object.entries(NOTE_ALIASES))(
    '%s resolves to %s in both directions',
    (alias, canonical) => {
      expect(canonicalNoteSlug(alias)).toBe(canonical);
      expect(canonicalNoteSlug(canonical)).toBe(canonical);
      expect(noteSlugVariants(alias)).toEqual(noteSlugVariants(canonical));
      expect(noteSlugVariants(alias)).toContain(alias);
      expect(noteSlugVariants(alias)[0]).toBe(canonical);
    },
  );

  it.each([
    'carnation',
    'sour-cherry',
    'mandarin',
    'tangerine',
    'cacao',
    'cocoa',
    'white-woods',
    'blonde-woods',
    'toString',
  ])('keeps distinct or unreviewed material %s', (slug) => {
    expect(canonicalNoteSlug(slug)).toBe(slug);
    expect(noteSlugVariants(slug)).toEqual([slug]);
  });
});
