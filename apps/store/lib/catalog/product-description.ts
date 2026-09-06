import type { Locale } from '@/i18n/config';
import type {
  Gender,
  NotePyramidDTO,
  ProductNoteDTO,
  ProductPerfumerDTO,
} from '@/lib/catalog/types';

// The stored descriptions are Fragrantica's template, scraped verbatim and
// filed under `ru` and `en` with the same English string in both — so a Russian
// visitor read "Sauvage by Dior is a Aromatic Fougere fragrance for men" on a
// Russian page, and an Uzbek visitor had no key at all. 133 of the 485 active
// products had no description in any language.
//
// Translating the 352 strings would have been the wrong repair. Every fact in
// that template already sits in a column: the brand, the launch year, the
// gender, the perfumers, and the note pyramid — and the note names are already
// carried in ru, uz and en. So the sentence is built rather than stored. That
// covers all 485 instead of 352, stays true when the data changes, and does not
// keep another site's prose in the database.
//
// The one thing lost is Fragrantica's own family label ("Aromatic Fougere"),
// which is not in any column. The shop's own note family stands in its place —
// the same taxonomy the catalogue filters by, so the page and the filter agree.

type Lang = 'ru' | 'en' | 'uz';

const toLang = (locale: string): Lang => (locale === 'en' || locale === 'uz' ? locale : 'ru');

// Adjectives, not the plural labels the catalogue pills use: this one has to
// agree with «аромат», so «древесный», not «Древесные».
const FAMILY: Record<Lang, Record<string, string>> = {
  ru: {
    floral: 'цветочный',
    woody: 'древесный',
    gourmand: 'гурманский',
    fruity: 'фруктовый',
    citrus: 'цитрусовый',
    spicy: 'пряный',
    aromatic: 'ароматический',
    balsamic: 'смолистый',
    green: 'зелёный',
    musky: 'мускусный',
    aquatic: 'водный',
    smoky: 'дымный',
    mineral: 'минеральный',
    mossy: 'мшистый',
    leather: 'кожаный',
  },
  en: {
    floral: 'floral',
    woody: 'woody',
    gourmand: 'gourmand',
    fruity: 'fruity',
    citrus: 'citrus',
    spicy: 'spicy',
    aromatic: 'aromatic',
    balsamic: 'balsamic',
    green: 'green',
    musky: 'musky',
    aquatic: 'aquatic',
    smoky: 'smoky',
    mineral: 'mineral',
    mossy: 'mossy',
    leather: 'leather',
  },
  uz: {
    floral: 'gulli',
    woody: 'yogʻochli',
    gourmand: 'shirin',
    fruity: 'mevali',
    citrus: 'sitrusli',
    spicy: 'ziravorli',
    aromatic: 'aromatik',
    balsamic: 'balzamik',
    green: 'yashil',
    musky: 'muskusli',
    aquatic: 'suvli',
    smoky: 'tutunli',
    mineral: 'mineral',
    mossy: 'moxli',
    leather: 'charmli',
  },
};

const GENDER: Record<Lang, Record<Gender, string>> = {
  ru: { men: 'для мужчин', women: 'для женщин', unisex: 'для мужчин и женщин' },
  en: { men: 'for men', women: 'for women', unisex: 'for men and women' },
  uz: { men: 'erkaklar uchun', women: 'ayollar uchun', unisex: 'erkaklar va ayollar uchun' },
};

const LAYER: Record<Lang, Record<keyof NotePyramidDTO, string>> = {
  ru: { top: 'Верхние ноты', middle: 'Ноты сердца', base: 'Базовые ноты' },
  en: { top: 'Top notes', middle: 'Heart notes', base: 'Base notes' },
  uz: { top: 'Yuqori notalar', middle: 'Yurak notalari', base: 'Bazaviy notalar' },
};

const PERFUMER: Record<Lang, { one: string; many: string; and: string }> = {
  ru: { one: 'Парфюмер', many: 'Парфюмеры', and: ' и ' },
  en: { one: 'Perfumer', many: 'Perfumers', and: ' and ' },
  uz: { one: 'Parfyumer', many: 'Parfyumerlar', and: ' va ' },
};

/** The family the most of a fragrance's notes belong to. */
const dominantFamily = (notes: NotePyramidDTO): string | undefined => {
  const tally = new Map<string, number>();
  for (const note of [...notes.top, ...notes.middle, ...notes.base]) {
    if (note.family) tally.set(note.family, (tally.get(note.family) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [family, count] of tally) {
    if (count > bestCount) {
      best = family;
      bestCount = count;
    }
  }
  return best;
};

const names = (notes: ProductNoteDTO[]): string => notes.map((n) => n.name).join(', ');

const joinPerfumers = (perfumers: ProductPerfumerDTO[], lang: Lang): string => {
  const copy = PERFUMER[lang];
  const list = perfumers.map((p) => p.name);
  const label = list.length > 1 ? copy.many : copy.one;
  const last = list[list.length - 1] ?? '';
  const joined = list.length > 1 ? `${list.slice(0, -1).join(', ')}${copy.and}${last}` : last;
  return `${label}: ${joined}.`;
};

export interface DescribableProduct {
  readonly name: string;
  readonly brand: string;
  readonly gender: Gender;
  readonly release_year?: number | null;
  readonly notes: NotePyramidDTO;
  readonly perfumers: readonly ProductPerfumerDTO[];
}

/**
 * The fragrance described in the reader's own language, built from its record.
 * Every clause is dropped when the data behind it is missing, so a product with
 * nothing but a brand and a gender still gets a true sentence.
 */
export const describeProduct = (product: DescribableProduct, locale: Locale | string): string => {
  const lang = toLang(locale);
  const family = dominantFamily(product.notes);
  const adjective = family ? FAMILY[lang][family] : undefined;
  const gender = GENDER[lang][product.gender];
  const year = product.release_year ?? undefined;

  const sentences: string[] = [];

  if (lang === 'ru') {
    const head = adjective ? `${adjective} аромат` : 'аромат';
    const launched = year ? `, выпущен в ${year} году` : '';
    sentences.push(`${product.name} — ${head} ${product.brand} ${gender}${launched}.`);
  } else if (lang === 'uz') {
    const head = adjective ? `${adjective} atiri` : 'atiri';
    const launched = year ? `, ${year}-yilda chiqarilgan` : '';
    sentences.push(`${product.name} — ${product.brand} brendining ${gender} ${head}${launched}.`);
  } else {
    const head = adjective ? `a ${adjective} fragrance` : 'a fragrance';
    const launched = year ? `, released in ${year}` : '';
    sentences.push(`${product.name} is ${head} by ${product.brand} ${gender}${launched}.`);
  }

  if (product.perfumers.length > 0) sentences.push(joinPerfumers([...product.perfumers], lang));

  const layers = (['top', 'middle', 'base'] as const)
    .filter((layer) => product.notes[layer].length > 0)
    .map((layer) => `${LAYER[lang][layer]}: ${names(product.notes[layer])}.`);
  if (layers.length > 0) sentences.push(layers.join(' '));

  return sentences.join(' ');
};
