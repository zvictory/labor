import { describe, expect, it } from 'vitest';
import { filterDirectory } from './directory-filter';

describe('directory search', () => {
  const groups = [
    { id: 'floral', items: [{ name: 'Роза' }, { name: 'Жасмин' }] },
    { id: 'wood', items: [{ name: 'Сандал' }] },
  ];
  it('searches later groups without changing family membership', () => {
    expect(filterDirectory(groups, ' САНД ', 'ru')).toEqual([groups[1]]);
    expect(groups[0]?.items).toHaveLength(2);
  });
  it('hides empty families and restores all families when cleared', () => {
    expect(filterDirectory(groups, 'missing', 'en')).toEqual([]);
    expect(filterDirectory(groups, ' ', 'ru')).toEqual(groups);
  });
  it('matches localized names regardless of case', () => {
    expect(filterDirectory([{ items: [{ name: 'O‘rik' }] }], 'O‘RIK', 'uz')).toHaveLength(1);
  });
});

// An old imported spelling must still find its canonical ingredient.
it('searches alias names without displaying duplicate entries', () => {
  const groups = [{ items: [{ name: 'Vanilla', searchTerms: ['Vanila', 'Vanille'] }] }];
  expect(filterDirectory(groups, 'vanille', 'en')[0]?.items).toHaveLength(1);
});
