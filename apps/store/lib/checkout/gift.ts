// The gift option's one shared limit. No server imports: the checkout form
// counts characters against it in the browser, and lib/orders/create.ts refuses
// a longer text.

/** A card holds a few lines. */
export const GIFT_NOTE_MAX = 300;
