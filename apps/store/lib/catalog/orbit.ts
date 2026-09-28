import { resolveLocaleText } from './locale';
import { notePicture } from './note-picture';
import { ORBIT_NOTE_FILES } from './orbit-notes';
import { toPyramidLayer, type OrbitNoteDTO } from './types';

export const ORBIT_MIN = 3;
export const ORBIT_MAX = 6;

/** The three orbit ellipses, as fractions of the card's 3:4 image box (approved prototype). */
export const ORBITS = [
  { rx: 0.38, ry: 0.36, tilt: 0 },
  { rx: 0.48, ry: 0.28, tilt: -14 },
  { rx: 0.3, ry: 0.46, tilt: 12 },
] as const;

/** Badge angles in degrees, counter-clockwise from 3 o'clock — clear of the cap (90°) and the base (270°). */
export const ORBIT_SLOTS = [140, 40, 220, -40, 180, 0] as const;

export const orbitSlot = (index: number): { left: number; top: number } => {
  const angle = ORBIT_SLOTS[index];
  if (angle === undefined)
    throw new RangeError(`No orbit slot ${index}; there are ${ORBIT_SLOTS.length}.`);
  const radians = (angle * Math.PI) / 180;
  const left = 50 + 38 * Math.cos(radians);
  const top = 50 - 36 * Math.sin(radians);
  return {
    left: Math.round(left * 100) / 100,
    top: Math.round(top * 100) / 100,
  };
};

const LAYERS = ['top', 'middle', 'base'] as const;

// Each note is drawn by the picture its product page shows (notePicture): our own
// cut-out, else the photograph mirrored from Fragrantica.
export const pickOrbitNotes = (
  rows: readonly {
    pyramidLayer: string;
    note: { slug: string; name: unknown; iconUrl?: string | null };
  }[],
  locale: string,
  files: Readonly<Record<string, string>> = ORBIT_NOTE_FILES,
): OrbitNoteDTO[] => {
  const seen = new Set<string>();
  const candidates = LAYERS.flatMap((layer) =>
    rows.filter((row) => toPyramidLayer(row.pyramidLayer) === layer),
  ).flatMap(({ note }) => {
    const picture = notePicture(
      { slug: note.slug, ...(note.iconUrl ? { icon_url: note.iconUrl } : {}) },
      files,
    );
    if (!picture || seen.has(note.slug)) return [];
    seen.add(note.slug);
    return [{ note, picture }];
  });
  // Our cut-outs take the six places first — the approved orbit was drawn with
  // them, and Ombre Nomade keeps its oud — and photographs fill what is left.
  // The badges still go round in the order the scent unfolds.
  const chosen = new Set(
    [
      ...candidates.filter(({ picture }) => picture.cutout),
      ...candidates.filter(({ picture }) => !picture.cutout),
    ].slice(0, ORBIT_MAX),
  );
  const picked = candidates
    .filter((candidate) => chosen.has(candidate))
    .map(({ note, picture }) => ({
      slug: note.slug,
      name: resolveLocaleText(note.name, locale),
      image: picture.src,
      cutout: picture.cutout,
    }));
  // A one- or two-note orbit reads as broken, not as a smaller orbit.
  return picked.length >= ORBIT_MIN ? picked : [];
};
