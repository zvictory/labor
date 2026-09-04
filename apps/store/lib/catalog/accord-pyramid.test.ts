import { expect, it } from 'vitest';

import { getPyramidRowWidth, groupAccordsIntoPyramid } from './accord-pyramid';

it('keeps accord strength order while widening rows toward the base', () => {
  expect(groupAccordsIntoPyramid(['a', 'b', 'c', 'd', 'e', 'f'])).toEqual([
    ['a'],
    ['b', 'c'],
    ['d', 'e', 'f'],
  ]);
});

it('sizes incomplete lower rows by their actual item count without overflowing the pyramid', () => {
  expect([1, 2, 3, 2].map(getPyramidRowWidth)).toEqual(['34%', '68%', '100%', '68%']);
});
