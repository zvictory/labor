// The catalogue lists 48 fragrances twice, and Tom Ford's Lost Cherry four
// times: 98 rows for 48 products.
//
// The copies sit in the id range 459-541 with the originals below it, and both
// blocks were imported the same day. What made this hard to read at first was
// the price: the second block carried a different figure for almost every
// fragrance — 5000 against 4000, 6000, 8000 — so archiving a row silently
// picked which price a customer would see. That is settled now: every decant
// is 160 000 UZS (scripts/set-fragrance-price.ts), the two blocks agree on
// price in all 48 groups, and what is left is only a duplicate record.
//
// Four groups only became visible once the names were corrected
// (lib/catalog/product-name-fixes.ts): "Rehab Initio Parfums Prives" and
// "Rehab" were the same fragrance the whole time, filed under two spellings.
//
// The rows are ARCHIVED, not deleted. getProduct does not filter on status, so
// an archived product keeps its page and every cart row pointing at it keeps
// working; only listProducts and the facet counts filter on `active`, which is
// where the duplicate was doing its damage. Reversing this is one UPDATE.
//
// Which row stays, in order:
//  1. The one carrying a cart, order, wishlist, vote or campaign reference.
//     Fifteen such references exist across these 98 rows and every one of them
//     is on a row that stays — nothing archived here is referenced by anybody.
//  2. The richer record (images + notes + accords + perfumers).
//  3. The slug the corrected name would produce, then the shorter slug.
//
// That order is why four groups keep the uglier slug: `lost-cherry-5` and
// `imagination-2` hold live carts, and `princess-by` and
// `oud-for-greatness-initio-parfums-prives` carry more notes and accords than
// their clean-slugged twins.
export interface DuplicateProductGroup {
  /** What every row in the group is called. */
  readonly name: string;
  /** The slug that stays in the catalogue. */
  readonly keep: string;
  /** Slugs to archive. */
  readonly archive: readonly string[];
}

export const DUPLICATE_PRODUCT_GROUPS: readonly DuplicateProductGroup[] = [
  { name: 'Afternoon Swim', keep: 'afternoon-swim', archive: ['afternoon-swim-2'] },
  { name: 'Andromeda', keep: 'andromeda', archive: ['andromeda-2'] },
  { name: 'Another 13', keep: 'another-13', archive: ['another-13-2'] },
  { name: 'Au Hasard', keep: 'au-hasard', archive: ['au-hasard-2'] },
  { name: 'Black Afgano', keep: 'black-afgano', archive: ['black-afgano-2'] },
  {
    name: 'Black Pepper, Amber, Neroli',
    keep: 'black-pepper-amber-neroli',
    archive: ['black-pepper-amber-neroli-2'],
  },
  { name: 'Bleu de Chanel', keep: 'blue', archive: ['bleu-de'] },
  { name: 'Bois Impérial', keep: 'bois-imperial', archive: ['bois-imp-rial'] },
  { name: 'Bombshell', keep: 'bombshell', archive: ['bombshell-2'] },
  { name: 'California Dream', keep: 'california-dream', archive: ['california-dream-2'] },
  { name: 'City Of Stars', keep: 'city-of-stars', archive: ['city-of-stars-2'] },
  { name: 'Dancing Blossom', keep: 'dancing-blossom', archive: ['dancing-blossom-2'] },
  { name: 'Delina', keep: 'delina', archive: ['delina-2'] },
  { name: 'Ebene Fume', keep: 'ebene-fume', archive: ['ebene-fume-2'] },
  { name: 'Electric Cherry', keep: 'electric-cherry', archive: ['electric-cherry-2'] },
  { name: 'Encelade', keep: 'encelade', archive: ['encelade-2'] },
  { name: 'Erba Pura', keep: 'erba-pura', archive: ['erba-pura-2'] },
  { name: 'Fahrenheit', keep: 'fahrenheit', archive: ['fahrenheit-2'] },
  { name: 'Ganymede', keep: 'ganymede', archive: ['ganymede-2'] },
  { name: 'Ganymede Extrait', keep: 'ganymede-extrait', archive: ['ganymede-extrait-2'] },
  { name: 'Gumin', keep: 'gumin', archive: ['gumin-2'] },
  { name: 'Hacivat', keep: 'hacivat', archive: ['hacivat-2'] },
  { name: 'Imagination', keep: 'imagination-2', archive: ['imagination'] },
  { name: 'Irish Leather', keep: 'irish-leather', archive: ['irish-leather-2'] },
  { name: 'Libre', keep: 'libre', archive: ['libre-2'] },
  { name: 'London', keep: 'london', archive: ['london-2'] },
  {
    name: 'Lost Cherry',
    keep: 'lost-cherry-5',
    archive: ['lost-cherry', 'lost-cherry-3', 'lost-cherry-4'],
  },
  { name: 'L’Heure Verte', keep: 'l-heure-verte', archive: ['l-heure-verte-by'] },
  { name: 'Marfa', keep: 'marfa', archive: ['marfa-2'] },
  { name: 'Meteore', keep: 'meteore', archive: ['meteore-2'] },
  { name: 'Musk Therapy', keep: 'musk-therapy', archive: ['musk-therapy-initio-parfums-prives'] },
  { name: 'My Way', keep: 'my-way', archive: ['my-way-2'] },
  { name: 'Ombre Nomade', keep: 'ombre-nomade', archive: ['ombre-nomade-2'] },
  { name: 'On The Beach', keep: 'on-the-beach', archive: ['on-the-beach-2'] },
  {
    name: 'Oud for Greatness',
    keep: 'oud-for-greatness-initio-parfums-prives',
    archive: ['oud-for-greatness'],
  },
  { name: 'Oud Wood', keep: 'oud-wood', archive: ['oud-wood-2'] },
  { name: 'Pacific Chill', keep: 'pacific-chill', archive: ['pacific-chill-2'] },
  { name: 'Parisian Musc', keep: 'parisian-musc', archive: ['parisian-musc-2'] },
  { name: 'Princess', keep: 'princess-by', archive: ['princess'] },
  { name: 'Rehab', keep: 'rehab', archive: ['rehab-initio-parfums-prives'] },
  { name: 'Rolling in Love', keep: 'rolling-in-love', archive: ['rolling-in-love-by'] },
  { name: 'Roses On Ice', keep: 'roses-on-ice', archive: ['roses-on-ice-by'] },
  { name: 'Santal 33', keep: 'santal-33', archive: ['santal-33-2'] },
  { name: 'Sauvage', keep: 'sauvage', archive: ['sauvage-2'] },
  { name: 'Stellar Times', keep: 'stellar-times', archive: ['stellar-times-2'] },
  { name: 'Symphony', keep: 'symphony', archive: ['symphony-2'] },
  { name: 'Tobacco Vanille', keep: 'tobacco-vanille', archive: ['tobacco-vanille-2'] },
  { name: 'Tygar', keep: 'tygar', archive: ['tygar-3'] },
];
