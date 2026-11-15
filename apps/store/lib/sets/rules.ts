// Discovery sets: a few 2 ml samples sold together for one price. Free of I/O,
// so the cart, the checkout and the tests share the same arithmetic. Storage
// lives in lib/sets/sets.ts.
//
// A set is not a line of its own in the cart. It is a price for a group of
// sample lines: while one sample of every perfume in the set is in the cart,
// the group costs the set price, and the difference comes off as a discount.
// The customer can therefore add the set with one button or collect the same
// samples one by one, and pays the same either way.

import { SAMPLE_PRICE } from '@/lib/money';

/** How many perfumes a set may hold. */
export const SET_MIN_ITEMS = 2;
export const SET_MAX_ITEMS = 10;

export interface SampleSetRule {
  slug: string;
  title: string;
  /** What one sample of each perfume costs together, in so'm. */
  price: number;
  productIds: readonly number[];
}

export interface AppliedSet {
  slug: string;
  title: string;
  /** How many times the whole set is in the cart. */
  count: number;
  /** So'm it takes off, for all `count` of them. */
  saving: number;
}

/** What one set saves against buying its samples singly; 0 when it saves nothing. */
export const setSaving = (
  rule: Pick<SampleSetRule, 'price' | 'productIds'>,
  samplePrice: number,
): number => {
  const size = new Set(rule.productIds).size;
  if (size < SET_MIN_ITEMS || size > SET_MAX_ITEMS || rule.price <= 0) return 0;
  return Math.max(0, size * samplePrice - rule.price);
};

export interface SetOfferDTO {
  /** So'm for one sample of each perfume. */
  price: number;
  /** The same samples bought one by one. */
  regular: number;
  saving: number;
  productIds: number[];
}

export type SetProblem = 'no_price' | 'too_few' | 'too_many' | 'product_off' | 'no_saving';

/**
 * Why a campaign with these perfumes and this price sells no set, or null when
 * it does. There is a set only while the campaign has a price that saves
 * something, between two and ten perfumes, and every one of them on sale: a
 * set with a perfume missing cannot be completed. The admin shows the reason.
 */
export const setProblem = (
  setPrice: number | null,
  products: readonly { productId: number; active: boolean }[],
  samplePrice: number = SAMPLE_PRICE,
): SetProblem | null => {
  if (setPrice === null || setPrice <= 0) return 'no_price';
  const size = new Set(products.map((p) => p.productId)).size;
  if (size < SET_MIN_ITEMS) return 'too_few';
  if (size > SET_MAX_ITEMS) return 'too_many';
  if (products.some((p) => !p.active)) return 'product_off';
  if (setPrice >= size * samplePrice) return 'no_saving';
  return null;
};

/** The set a campaign sells, or null (see setProblem). */
export const setOffer = (
  setPrice: number | null,
  products: readonly { productId: number; active: boolean }[],
  samplePrice: number = SAMPLE_PRICE,
): SetOfferDTO | null => {
  if (setPrice === null || setProblem(setPrice, products, samplePrice) !== null) return null;
  const productIds = [...new Set(products.map((p) => p.productId))];
  const regular = productIds.length * samplePrice;
  return { price: setPrice, regular, saving: regular - setPrice, productIds };
};

/**
 * The sets the cart's samples complete, and what they take off.
 *
 * `sampleQty` is the number of samples per product. A sample counts towards
 * one set only, so when two sets share a perfume the one that saves more is
 * filled first.
 */
export const applySampleSets = (
  rules: readonly SampleSetRule[],
  sampleQty: ReadonlyMap<number, number>,
  samplePrice: number,
): { discount: number; applied: AppliedSet[] } => {
  const left = new Map(sampleQty);
  const ranked = rules
    .map((rule) => ({ rule, each: setSaving(rule, samplePrice) }))
    .filter((r) => r.each > 0)
    .sort((a, b) => b.each - a.each || a.rule.slug.localeCompare(b.rule.slug));

  const applied: AppliedSet[] = [];
  for (const { rule, each } of ranked) {
    const ids = [...new Set(rule.productIds)];
    const count = Math.min(...ids.map((id) => left.get(id) ?? 0));
    if (count <= 0) continue;
    for (const id of ids) left.set(id, (left.get(id) ?? 0) - count);
    applied.push({ slug: rule.slug, title: rule.title, count, saving: count * each });
  }
  return { discount: applied.reduce((sum, set) => sum + set.saving, 0), applied };
};
