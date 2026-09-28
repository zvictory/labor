import { describe, expect, it } from 'vitest';

import { notePicture } from './note-picture';

// The product page shows each note as a picture in a glass bead, as the card's
// orbit does. Where we have our own cut-out of an ingredient the page has to use
// it, or the rose that orbited the card a click ago comes back as a different rose.
describe('notePicture', () => {
  const files = { rose: 'rose.webp' };

  it('prefers our own cut-out, the one the card orbit shows', () => {
    expect(notePicture({ slug: 'rose', icon_url: '/notes/prod/rose.jpg' }, files)).toEqual({
      src: '/notes/orbit/rose.webp',
      cutout: true,
    });
  });

  it('falls back to the mirrored photograph', () => {
    expect(notePicture({ slug: 'amber', icon_url: '/notes/prod/amber.jpg' }, files)).toEqual({
      src: '/notes/prod/amber.jpg',
      cutout: false,
    });
  });

  it('gives a note with neither no picture, so its bead shows the initial, not a stand-in', () => {
    expect(notePicture({ slug: 'labdanum' }, files)).toBeNull();
  });

  // Fragrantica files one ingredient under more than one note and the catalogue
  // took them all: 31 products list "Incense" and 8 "Olibanum" against 5
  // "Frankincense", 23 "Agarwood (Oud)" against 4 "Agarwood". Read against the
  // shipped manifest, because the aliases live in scripts/build-orbit-manifest.ts
  // and a regeneration must not drop them.
  it.each([
    ['incense', 'frankincense.webp'],
    ['olibanum', 'frankincense.webp'],
    ['agarwood-oud', 'agarwood.webp'],
  ] as const)('gives %s our cut-out of the same ingredient', (slug, file) => {
    expect(notePicture({ slug, icon_url: `/notes/prod/${slug}.jpg` })).toEqual({
      src: `/notes/orbit/${file}`,
      cutout: true,
    });
  });
});
