import { describe, expect, it } from 'vitest';
import { equalLinks, planNoteMerge, rollbackNoteMergeState } from './note-merge';
import { NOTE_ALIASES } from './note-aliases';

const pair = Object.entries(NOTE_ALIASES)[0]!;
const notes = [
  { id: 1, slug: pair[0] },
  { id: 2, slug: pair[1] },
  { id: 3, slug: 'unrelated-test-note' },
];
const row = (id: number, noteId: number, pyramidLayer = 'top', position = 0, productId = 10) => ({
  id,
  noteId,
  pyramidLayer,
  position,
  productId,
});
describe('safe note merge', () => {
  it('keeps earliest position when alias and canonical overlap in the same layer', () => {
    const result = planNoteMerge(notes, [row(1, 1, 'top', 2), row(2, 2, 'top', 5)]);
    expect(result.after).toEqual([row(1, 2, 'top', 2)]);
  });
  it('keeps canonical ID for ties and never collapses different pyramid layers', () => {
    const result = planNoteMerge(notes, [row(1, 1), row(2, 2), row(3, 1, 'base')]);
    expect(result.after).toEqual([row(2, 2), row(3, 2, 'base')]);
  });
  it('transfers all products including inactive memberships and excludes unrelated groups', () => {
    const result = planNoteMerge(notes, [row(1, 1), row(2, 1, 'base', 8, 999), row(3, 3)]);
    expect(result.after).toEqual([row(1, 2), row(2, 2, 'base', 8, 999)]);
    expect(result.before).toHaveLength(2);
  });
  it('is idempotent and retains an exact rollback snapshot', () => {
    const original = [row(1, 1), row(2, 2)];
    const result = planNoteMerge(notes, original);
    expect(equalLinks(planNoteMerge(notes, result.after).before, result.after)).toBe(true);
    expect(result.before).toEqual(original);
    expect(equalLinks(result.before, result.after)).toBe(false);
  });
  it('refuses to merge if the canonical Note is missing', () => {
    expect(() => planNoteMerge([notes[0]!], [row(1, 1)])).toThrow('Missing canonical note');
  });
});

it('rollback refuses changed or newly added memberships and is repeatable', () => {
  const before = [row(1, 1)];
  const after = [row(1, 2)];
  expect(rollbackNoteMergeState(after, before, after)).toBe('restore');
  expect(rollbackNoteMergeState(before, before, after)).toBe('already-restored');
  expect(() => rollbackNoteMergeState([row(1, 2, 'top', 99)], before, after)).toThrow('changed');
  expect(() => rollbackNoteMergeState([...after, row(2, 2)], before, after)).toThrow('changed');
});
