// Keep legacy fallback fixtures independent from the growing completed-asset registry.
vi.mock('./note-library.generated', () => ({ NOTE_LIBRARY_ASSETS: {} }));
import { describe, expect, it, vi } from 'vitest';
import { notePilotImage, NOTE_PILOT_SLUGS } from './note-pilot';
import { notePicture } from './note-picture';
import { resolveNoteImage } from './taxonomy-images';

describe('shared Labor pilot', () => {
  it.each(NOTE_PILOT_SLUGS)(
    'shows the same %s specimen in the directory and product beads/orbits',
    (slug) => {
      const expected = `/notes/labor-pilot-v1/${slug}.webp`;
      expect(resolveNoteImage({ slug, iconUrl: '/old-photo.jpg', productImageUrls: [] })).toBe(
        expected,
      );
      expect(notePicture({ slug, icon_url: '/old-photo.jpg' })).toEqual({
        src: expected,
        cutout: true,
      });
    },
  );
  it('uses the canonical specimen for old spelling aliases', () => {
    expect(notePilotImage('vanila')).toBe(notePilotImage('vanilla'));
    expect(notePilotImage('sandal')).toBe(notePilotImage('sandalwood'));
    expect(notePilotImage('tonka')).toBe(notePilotImage('tonka-bean'));
  });
  it('leaves incomplete library entries on their existing image fallback', () => {
    expect(notePilotImage('musk')).toBeUndefined();
    expect(notePilotImage('amber')).toBeUndefined();
    expect(notePilotImage('ambroxan')).toBeUndefined();
  });
});
