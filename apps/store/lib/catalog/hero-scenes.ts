export type HeroScene = {
  /** Public path of the scene photograph. */
  src: string;
  /** CSS object-position that keeps the subject in frame when the scene is cropped. */
  position: string;
  /**
   * Public path of the scene's loop, without its width: see
   * {@link heroVideoFile}. The photograph stays underneath it, as the poster
   * and as the whole scene where the loop does not play.
   */
  video?: string;
};

// A loop is cut from a five-second clip generated from the photograph: a
// stretch where the motion runs evenly plays forward and back, easing into
// each turn, so it has no seam; a cycle lasts 7.75 to 9 seconds, longer than
// a slide shows, and plays once (SceneVideo), so a slide held longer rests on
// the photograph. It starts on or near the photograph, fitted to its colours,
// and a bottle's label is laid back from the photograph, so the lettering
// never wavers.

/** A loop's file for the viewport: full width from the lg breakpoint, a lighter cut below it. */
export const heroVideoFile = (video: string, desktop: boolean): string =>
  `${video}-${desktop ? 1920 : 1280}.mp4`;

// A slide opens full-bleed on its product's scene when one exists; any other
// product keeps the plain bottle layout.
// The bottle sits right of centre so the left side stays calm for the text.
// The crops lean left (35%): when a narrow desktop cuts the photo, the right
// edge goes first and the still life stays clear of the text. They also sit a
// little high (40%): a wide screen trims the stone under the bottle before it
// reaches the cap.
export const HERO_SCENES: Readonly<Record<string, HeroScene>> = {
  'ombre-nomade': {
    src: '/hero/ombre-nomade.webp',
    position: '35% 40%',
    video: '/hero/ombre-nomade',
  },
  'imagination-2': {
    src: '/hero/imagination.webp',
    position: '35% 40%',
    video: '/hero/imagination',
  },
  'baccarat-extrait-maison': {
    src: '/hero/baccarat-rouge-540-extrait.webp',
    position: '35% 40%',
    video: '/hero/baccarat-rouge-540-extrait',
  },
};

/** How many product slides the home hero carries; the stories come on top. */
export const HERO_PRODUCTS = 3;

// The hero's bottles after the admin's featured product, in order: a warm, a
// cool and a red one. Until a product's scene is shot, its slide shows the
// bottle on paper.
export const HERO_LINEUP: readonly string[] = [
  'ombre-nomade',
  'imagination-2',
  'baccarat-extrait-maison',
];

/**
 * The hero's slugs in slide order: the featured product first (staff tick it
 * to show first), then the lineup, then the best-rated as a top-up — each
 * product once, at most {@link HERO_PRODUCTS}.
 */
export const pickHeroSlugs = ({
  featured,
  lineup,
  topRated,
}: {
  featured: string | null;
  lineup: readonly string[];
  topRated: readonly string[];
}): string[] =>
  [...new Set([...(featured === null ? [] : [featured]), ...lineup, ...topRated])].slice(
    0,
    HERO_PRODUCTS,
  );

export type HeroStoryId = 'decants' | 'blotters' | 'uzbekistan' | 'notes';

/** A slide about the shop rather than one bottle; its copy is in components/home/hero.tsx. */
export type HeroStory = HeroScene & {
  id: HeroStoryId;
  /** Storefront path the slide leads to, after the locale prefix. */
  path: string;
  /**
   * The crop below the lg breakpoint. On a phone the text sits under the
   * photograph, not beside it, so the crop leans right and keeps the whole
   * still life, which stands right of centre.
   */
  phonePosition: string;
};

// The stories take turns with the bottles, in this order. Decants come first
// because they are what the shop sells; then how to choose, how an order
// travels and where a scent starts. Against the lineup this also keeps
// neighbouring slides apart in colour: paper after the turquoise bottle, blue
// tiles after the red one. The subjects sit lower in these photographs than
// the bottles do in theirs, so the crops sit lower too.
export const HERO_STORIES: readonly HeroStory[] = [
  {
    id: 'decants',
    path: '/catalog',
    src: '/hero/story-decants.webp',
    video: '/hero/story-decants',
    position: '35% 55%',
    phonePosition: '100% 55%',
  },
  {
    id: 'blotters',
    path: '/find-your-perfume',
    src: '/hero/story-blotters.webp',
    video: '/hero/story-blotters',
    position: '35% 50%',
    phonePosition: '100% 50%',
  },
  {
    id: 'uzbekistan',
    path: '/delivery',
    src: '/hero/story-uzbekistan.webp',
    video: '/hero/story-uzbekistan',
    position: '35% 60%',
    phonePosition: '100% 60%',
  },
  {
    id: 'notes',
    path: '/notes',
    src: '/hero/story-notes.webp',
    video: '/hero/story-notes',
    position: '35% 55%',
    phonePosition: '100% 55%',
  },
];

export type HeroSlot<P, S> = { kind: 'product'; product: P } | { kind: 'story'; story: S };

/**
 * The hero's slides in order: bottles and stories take turns, a bottle first
 * (the featured one opens the page). Whichever list runs out first leaves the
 * rest of the other at the end.
 */
export const weaveHeroSlides = <P, S>(
  products: readonly P[],
  stories: readonly S[],
): HeroSlot<P, S>[] =>
  Array.from({ length: Math.max(products.length, stories.length) }, (_, i) => i).flatMap((i) => [
    ...products.slice(i, i + 1).map((product): HeroSlot<P, S> => ({ kind: 'product', product })),
    ...stories.slice(i, i + 1).map((story): HeroSlot<P, S> => ({ kind: 'story', story })),
  ]);
