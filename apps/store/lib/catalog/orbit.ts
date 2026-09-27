import { resolveLocaleText } from './locale';
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

export const pickOrbitNotes = (
  rows: readonly { pyramidLayer: string; note: { slug: string; name: unknown } }[],
  locale: string,
  files: Readonly<Record<string, string>> = ORBIT_NOTE_FILES,
): OrbitNoteDTO[] => {
  const seen = new Set<string>();
  const picked = LAYERS.flatMap((layer) =>
    rows.filter((row) => toPyramidLayer(row.pyramidLayer) === layer),
  )
    .filter(({ note }) => {
      if (seen.has(note.slug) || !Object.prototype.hasOwnProperty.call(files, note.slug))
        return false;
      seen.add(note.slug);
      return true;
    })
    .slice(0, ORBIT_MAX)
    .map(({ note }) => ({
      slug: note.slug,
      name: resolveLocaleText(note.name, locale),
      image: `/notes/orbit/${files[note.slug]}`,
    }));
  // A one- or two-note orbit reads as broken, not as a smaller orbit.
  return picked.length >= ORBIT_MIN ? picked : [];
};
