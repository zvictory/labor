import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  HERO_PRODUCTS,
  HERO_SCENES,
  HERO_STORIES,
  pickHeroSlugs,
  weaveHeroSlides,
  type HeroSlot,
} from './hero-scenes';

describe('pickHeroSlugs', () => {
  it('opens on the featured product, because staff tick it to show first', () => {
    const slugs = pickHeroSlugs({ featured: 'f', lineup: ['a', 'b'], topRated: ['t'] });
    expect(slugs[0]).toBe('f');
  });

  it('keeps the lineup in its order, so the palettes alternate as arranged', () => {
    const slugs = pickHeroSlugs({ featured: null, lineup: ['a', 'b', 'c'], topRated: ['t'] });
    expect(slugs).toEqual(['a', 'b', 'c']);
  });

  it('shows a product once when it is both featured and in the lineup', () => {
    const slugs = pickHeroSlugs({ featured: 'b', lineup: ['a', 'b', 'c'], topRated: [] });
    expect(slugs).toEqual(['b', 'a', 'c']);
  });

  it('tops up with the best-rated when the lineup is short, so the hero keeps its slides', () => {
    const slugs = pickHeroSlugs({ featured: null, lineup: ['a'], topRated: ['a', 't1', 't2'] });
    expect(slugs).toEqual(['a', 't1', 't2']);
  });

  it('stops at the product count, so the stories still fit between the bottles', () => {
    const slugs = pickHeroSlugs({ featured: 'f', lineup: ['a', 'b', 'c'], topRated: ['t'] });
    expect(slugs).toHaveLength(HERO_PRODUCTS);
  });
});

const names = (slots: HeroSlot<string, string>[]) =>
  slots.map((slot) => (slot.kind === 'product' ? slot.product : slot.story));

describe('weaveHeroSlides', () => {
  it('opens on a bottle, so the featured product still leads the page', () => {
    const [first] = weaveHeroSlides(['p1', 'p2'], ['s1', 's2']);
    expect(first).toEqual({ kind: 'product', product: 'p1' });
  });

  it('lets bottles and stories take turns, each list in its own order', () => {
    const slots = weaveHeroSlides(['p1', 'p2', 'p3'], ['s1', 's2', 's3']);
    expect(names(slots)).toEqual(['p1', 's1', 'p2', 's2', 'p3', 's3']);
  });

  it('puts the stories left over after the last bottle, dropping none', () => {
    const slots = weaveHeroSlides(['p1', 'p2', 'p3'], ['s1', 's2', 's3', 's4']);
    expect(names(slots)).toEqual(['p1', 's1', 'p2', 's2', 'p3', 's3', 's4']);
  });

  it('shows the stories alone when no product can open the hero', () => {
    expect(names(weaveHeroSlides([], ['s1', 's2']))).toEqual(['s1', 's2']);
  });
});

describe('hero photographs', () => {
  // A renamed or missing file would leave a blank slide in production.
  const publicFile = (src: string) => new URL(`../../public${src}`, import.meta.url);

  it('ships every scene and story photograph with the app', () => {
    const srcs = [...Object.values(HERO_SCENES), ...HERO_STORIES].map((scene) => scene.src);
    expect(srcs.filter((src) => !existsSync(publicFile(src)))).toEqual([]);
  });

  it('sends every story to a storefront path, once', () => {
    const paths = HERO_STORIES.map((story) => story.path);
    expect(paths.every((path) => path.startsWith('/'))).toBe(true);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
