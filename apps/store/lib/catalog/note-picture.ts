import { ORBIT_NOTE_FILES } from './orbit-notes';

export interface NotePicture {
  src: string;
  /** Our own cut-out on a clear ground, drawn whole in the bead; a mirrored photograph is square and fills it. */
  cutout: boolean;
}

// The picture a note is shown by, on the product page and in the card orbit alike.
// Our own cut-outs come first; the photographs mirrored from Fragrantica
// (scripts/mirror-note-icons.ts) cover most of the rest.
export const notePicture = (
  note: { slug: string; icon_url?: string },
  files: Readonly<Record<string, string>> = ORBIT_NOTE_FILES,
): NotePicture | null => {
  if (Object.prototype.hasOwnProperty.call(files, note.slug))
    return { src: `/notes/orbit/${files[note.slug]}`, cutout: true };
  if (note.icon_url) return { src: note.icon_url, cutout: false };
  return null;
};
