import { describe, expect, it } from 'vitest';

import { describeProduct, type DescribableProduct } from './product-description';

const note = (slug: string, name: string, family?: string) => ({
  slug,
  name,
  ...(family ? { family } : {}),
});

const sauvage: DescribableProduct = {
  name: 'Sauvage',
  brand: 'Dior',
  gender: 'men',
  release_year: 2015,
  notes: {
    top: [note('bergamot', 'Бергамот', 'citrus'), note('pepper', 'Перец', 'spicy')],
    middle: [note('lavender', 'Лаванда', 'aromatic')],
    base: [
      note('cedar', 'Кедр', 'woody'),
      note('patchouli', 'Пачули', 'woody'),
      note('vetiver', 'Ветивер', 'woody'),
    ],
  },
  perfumers: [{ slug: 'francois-demachy', name: 'François Demachy' }],
};

describe('describeProduct', () => {
  it('writes the sentence in the reader’s language, not the language it was scraped in', () => {
    // The whole point: a Russian page used to read "Sauvage by Dior is a
    // Aromatic Fougere fragrance for men", because the scraped English was
    // stored under `ru` too.
    expect(describeProduct(sauvage, 'ru')).toContain('древесный аромат Dior для мужчин');
    expect(describeProduct(sauvage, 'en')).toContain('a woody fragrance by Dior for men');
    expect(describeProduct(sauvage, 'uz')).toContain(
      'Dior brendining erkaklar uchun yogʻochli atiri',
    );
  });

  it('takes the family from whichever family most of the notes belong to', () => {
    // Three woody against two citrus and one each of spicy and aromatic.
    expect(describeProduct(sauvage, 'ru')).toContain('древесный');
  });

  it('names the perfumer and the pyramid', () => {
    const ru = describeProduct(sauvage, 'ru');
    expect(ru).toContain('Парфюмер: François Demachy.');
    expect(ru).toContain('Верхние ноты: Бергамот, Перец.');
    expect(ru).toContain('Ноты сердца: Лаванда.');
    expect(ru).toContain('Базовые ноты: Кедр, Пачули, Ветивер.');
  });

  it('pluralises the perfumer label and joins with the locale’s word for "and"', () => {
    const two = {
      ...sauvage,
      perfumers: [
        { slug: 'a', name: 'A' },
        { slug: 'b', name: 'B' },
      ],
    };
    expect(describeProduct(two, 'ru')).toContain('Парфюмеры: A и B.');
    expect(describeProduct(two, 'en')).toContain('Perfumers: A and B.');
    expect(describeProduct(two, 'uz')).toContain('Parfyumerlar: A va B.');
  });

  it('drops every clause whose data is missing rather than printing a gap', () => {
    // 133 active products carry no description, 116 no notes and 229 no
    // perfumer. Each of those still has to read as a finished sentence.
    const bare: DescribableProduct = {
      name: 'Gumin',
      brand: 'Xerjoff',
      gender: 'unisex',
      release_year: null,
      notes: { top: [], middle: [], base: [] },
      perfumers: [],
    };
    expect(describeProduct(bare, 'ru')).toBe('Gumin — аромат Xerjoff для мужчин и женщин.');
    expect(describeProduct(bare, 'en')).toBe('Gumin is a fragrance by Xerjoff for men and women.');
    expect(describeProduct(bare, 'uz')).toBe(
      'Gumin — Xerjoff brendining erkaklar va ayollar uchun atiri.',
    );
  });

  it('falls back to Russian for an unknown locale, the shop’s default', () => {
    expect(describeProduct(sauvage, 'de')).toBe(describeProduct(sauvage, 'ru'));
  });
});
