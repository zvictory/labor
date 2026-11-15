import { describe, expect, it, vi } from 'vitest';

vi.mock('./note-library.generated', () => ({
  NOTE_LIBRARY_ASSETS: {
    amber: { src: '/notes/labor-library-v1/amber.webp', representative: true },
    lavender: { src: '/notes/labor-library-v1/lavender.webp', representative: false },
  },
}));

import { noteLaborAsset, noteRepresentativeLabel } from './note-pilot';
import { notePicture } from './note-picture';
import { resolveNoteImage } from './taxonomy-images';

describe('completed Labor library assets', () => {
  it('shares a completed specimen across directory and product beads/orbits', () => {
    expect(noteLaborAsset('lavender')).toEqual({
      src: '/notes/labor-library-v1/lavender.webp',
      representative: false,
    });
    expect(resolveNoteImage({ slug: 'lavender', iconUrl: '/old.jpg', productImageUrls: [] })).toBe(
      '/notes/labor-library-v1/lavender.webp',
    );
    expect(notePicture({ slug: 'lavender', icon_url: '/old.jpg' })).toEqual({
      src: '/notes/labor-library-v1/lavender.webp',
      cutout: true,
    });
  });
  it('marks an abstract texture as representative instead of a physical specimen', () => {
    expect(notePicture({ slug: 'amber' })).toEqual({
      src: '/notes/labor-library-v1/amber.webp',
      cutout: true,
      representative: true,
    });
    expect(noteLaborAsset('amber')?.representative).toBe(true);
  });
  it('keeps original pictures while an ingredient has not been completed', () => {
    expect(noteLaborAsset('not-produced-yet')).toBeUndefined();
    expect(notePicture({ slug: 'not-produced-yet', icon_url: '/original.jpg' })).toEqual({
      src: '/original.jpg',
      cutout: false,
    });
  });
  it('labels representative images in every supported language', () => {
    expect(noteRepresentativeLabel('ru')).toBe('Образ ноты');
    expect(noteRepresentativeLabel('uz')).toBe('Ramziy tasvir');
    expect(noteRepresentativeLabel('en')).toBe('Representative image');
  });
});
