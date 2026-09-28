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
});
