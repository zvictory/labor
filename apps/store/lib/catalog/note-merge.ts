import { canonicalNoteSlug, NOTE_ALIASES } from './note-aliases';

export interface NoteLink {
  id: number;
  productId: number;
  noteId: number;
  pyramidLayer: string;
  position: number;
}
export interface MergeNote {
  id: number;
  slug: string;
}

export function planNoteMerge(notes: MergeNote[], links: NoteLink[]) {
  const bySlug = new Map(notes.map((note) => [note.slug, note]));
  const groups = new Map<string, NoteLink[]>();
  const byId = new Map(notes.map((note) => [note.id, note]));
  const linksById = new Map(links.map((row) => [row.id, row]));
  const affected = new Set<number>();
  for (const note of notes) {
    if (!(note.slug in NOTE_ALIASES) && !Object.values(NOTE_ALIASES).includes(note.slug)) continue;
    affected.add(note.id);
    const canonical = canonicalNoteSlug(note.slug);
    if (!bySlug.has(canonical)) throw new Error(`Missing canonical note: ${canonical}`);
  }
  for (const link of links.filter((row) => affected.has(row.noteId))) {
    const note = byId.get(link.noteId)!;
    const canonicalId = bySlug.get(canonicalNoteSlug(note.slug))!.id;
    const key = `${link.productId}:${canonicalId}:${link.pyramidLayer}`;
    groups.set(key, [...(groups.get(key) ?? []), { ...link, noteId: canonicalId }]);
  }
  const after = [...groups.values()]
    .map((rows) => {
      // Earliest position wins, then the existing canonical link, then stable ID.
      const sorted = [...rows].sort(
        (a, b) =>
          a.position - b.position ||
          Number(linksById.get(a.id)!.noteId !== a.noteId) -
            Number(linksById.get(b.id)!.noteId !== b.noteId) ||
          a.id - b.id,
      );
      return sorted[0]!;
    })
    .sort((a, b) => a.id - b.id);
  const before = links.filter((row) => affected.has(row.noteId)).sort((a, b) => a.id - b.id);
  return { affectedIds: [...affected].sort((a, b) => a - b), before, after };
}

export function equalLinks(a: NoteLink[], b: NoteLink[]) {
  return (
    JSON.stringify([...a].sort((x, y) => x.id - y.id)) ===
    JSON.stringify([...b].sort((x, y) => x.id - y.id))
  );
}

export function rollbackNoteMergeState(current: NoteLink[], before: NoteLink[], after: NoteLink[]) {
  if (equalLinks(current, before)) return 'already-restored';
  if (!equalLinks(current, after))
    throw new Error('Affected memberships changed since migration; rollback refused');
  return 'restore';
}
