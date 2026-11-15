import { describe, expect, it } from 'vitest';
import {
  rankProducts,
  scoreProduct,
  type Answers,
  type FinderCandidate,
  type FinderCopy,
} from './finder-model';

const copy: Pick<FinderCopy, 'reasons'> = {
  reasons: {
    family: 'Family: {family}',
    gender: 'Style: {style}',
    occasion: 'Notes for {occasion}',
    alternative: 'Compare with {family}',
  },
};
const product: FinderCandidate = {
  id: 1,
  slug: 'test',
  name: 'Test',
  brand: 'Test',
  price: 900_000,
  image: '',
  avg_rating: 8,
  matchedFamilies: ['woody'],
  matchedGender: 'men',
};
const choice = { id: 'test', label: 'Selected', text: '' };

describe('finder ranking contract', () => {
  it('keeps the original ranking weights and cap while replacing the visual report', () => {
    const answers: Answers = {
      family: { ...choice, families: ['woody'] },
      style: { ...choice, gender: 'men' },
      occasion: { ...choice, families: ['woody'] },
      presence: { ...choice, presence: 'bold' },
    };
    expect(scoreProduct(product, answers, copy).score).toBe(98);
    expect(scoreProduct(product, {}, copy).score).toBe(50);
    expect(scoreProduct(product, { family: answers.family }, copy).score).toBe(74);
    expect(scoreProduct(product, { style: answers.style }, copy).score).toBe(66);
    expect(scoreProduct(product, { occasion: answers.occasion }, copy).score).toBe(64);
  });
  it.each([
    ['quiet', 60, 46],
    ['balanced', 62, 48],
    ['bold', 66, 48],
  ] as const)(
    'preserves %s heuristics without presenting them as verified projection',
    (presence, expected, fallback) => {
      const answers: Answers = { presence: { ...choice, presence } };
      expect(scoreProduct(product, answers, copy).score).toBe(expected);
      expect(
        scoreProduct(
          { ...product, price: 2_000_000, avg_rating: 6, matchedFamilies: [] },
          answers,
          copy,
        ).score,
      ).toBe(fallback);
      expect(scoreProduct(product, answers, copy).reasons).toEqual(['Compare with —']);
    },
  );
  it('only explains catalog attributes that overlap the selected choices', () => {
    const answers: Answers = {
      family: { ...choice, label: 'Woods', families: ['woody'] },
      style: { ...choice, label: 'Feminine', gender: 'women' },
    };
    expect(scoreProduct(product, answers, copy).reasons).toEqual(['Family: Woods']);
    expect(answers.family?.label).toBe('Woods');
  });
  it('returns exactly three and resolves score ties by rating, retaining catalog order on equal ratings', () => {
    const candidates = [
      { ...product, id: 1, avg_rating: 8 },
      { ...product, id: 2, avg_rating: 9 },
      { ...product, id: 3, avg_rating: 9 },
      { ...product, id: 4, avg_rating: 7.5 },
    ];
    expect(rankProducts(candidates, {}, copy).map(({ product: item }) => item.id)).toEqual([
      2, 3, 1,
    ]);
    expect(candidates.map(({ id }) => id)).toEqual([1, 2, 3, 4]);
  });
});
