import { describe, expect, it } from 'vitest';
import type { FinderCopy } from './finder-model';
import { finderAnswers, parseFinderSession } from './finder-session';

function steps(label: string): FinderCopy['steps'] {
  return (['style', 'family', 'occasion', 'presence'] as const).map((key) => ({
    key,
    eyebrow: '',
    title: '',
    helper: '',
    choices: [{ id: `${key}-id`, label, text: '' }],
  }));
}

const now = 1760000000000;
const draft = { ids: { style: 'style-id' }, step: 1, complete: false, updatedAt: now };

describe('finder session', () => {
  it('resolves saved IDs using the current language', () => {
    const restored = parseFinderSession(JSON.stringify(draft), steps('Русский'), now);
    expect(restored).toEqual(draft);
    expect(finderAnswers(restored!.ids, steps('English')).style?.label).toBe('English');
  });

  it('restores a finished session only with all four valid choices', () => {
    const complete = {
      ...draft,
      ids: {
        style: 'style-id',
        family: 'family-id',
        occasion: 'occasion-id',
        presence: 'presence-id',
      },
      step: 3,
      complete: true,
    };
    expect(parseFinderSession(JSON.stringify(complete), steps('English'), now)).toEqual(complete);
    expect(
      parseFinderSession(JSON.stringify({ ...draft, complete: true }), steps('English'), now),
    ).toBeNull();
  });

  it('discards expired or incompatible data and prevents skipping unanswered questions', () => {
    const choices = steps('English');
    expect(parseFinderSession(JSON.stringify(draft), choices, now + 30 * 86400000)).toBeNull();
    expect(
      parseFinderSession(JSON.stringify({ ...draft, ids: { style: 'removed' } }), choices, now),
    ).toBeNull();
    expect(parseFinderSession(JSON.stringify({ ...draft, step: 3 }), choices, now)).toBeNull();
    expect(parseFinderSession('broken', choices, now)).toBeNull();
  });
});
