// Product names as the import left them, and what they should read.
//
// Three separate mistakes are in here, and they came from the same place: the
// names were scraped from Fragrantica, which titles a page "<Name> <Brand>" —
// or "<Name> by <Brand>" for houses whose name starts with "by".
//
//  1. The brand was left glued to the end: "Apex Roja Dove", "Idôle Lancôme".
//     Not every trailing brand is wrong, which is why this file is a list and
//     not a rule: "Terre d'Hermès", "Miss Dior Blooming Bouquet" and "Flora by
//     Gucci Eau Fraiche" all carry their house inside the real name, and a
//     strip-the-brand rule quietly turns the first into "Terre".
//  2. The "by" survived and the brand did not: fourteen By Kilian fragrances
//     and one BORNTOSTANDOUT are stored as "Black Phantom By", "FUGAZZI by".
//  3. A handful arrived shouting, whispering, or carrying a customs
//     description: "LUNARIO", "lost cherry", "смесь душистых веществ LOST
//     CHERRY".
//
// `from` is a guard, not documentation: the fix is applied only to a row whose
// name still reads exactly that, so the script is idempotent and cannot damage
// a name someone has since corrected by hand.
//
// Deliberately NOT in here:
//  - Nishane's "Hacivat X", "Ani X" and "Hundred Silent Ways X". They look
//    truncated and are not: each is a 2023 release sitting beside its own
//    earlier fragrance with a different accord set.
//  - The straight vs curly apostrophe split (13 rows on ' against 16 on ’).
//    Normalising either way is churn, and the actual defect is that catalogue
//    search compares the two as different characters — that belongs in the
//    query, not in the data.
//  - The Russian-named labor goods (diffusers, shower gel, car perfume, soap).
//    Naming those needs the shop, not a rule.
export interface ProductNameFix {
  /** Stable across environments, unlike the row id. */
  readonly slug: string;
  /** Only a row still reading exactly this is touched. */
  readonly from: string;
  readonly to: string;
}

export const PRODUCT_NAME_FIXES: readonly ProductNameFix[] = [
  // ---- the brand left glued to the end of the name ----
  { slug: 'aoud-roja-dove', from: 'Aoud Roja Dove', to: 'Aoud' },
  { slug: 'lost-in-paris-roja-dove', from: 'Lost In Paris Roja Dove', to: 'Lost In Paris' },
  { slug: 'apex-roja-dove', from: 'Apex Roja Dove', to: 'Apex' },
  { slug: 'manhattan-roja-dove', from: 'Manhattan Roja Dove', to: 'Manhattan' },
  { slug: 'oligarch-roja-dove', from: 'Oligarch Roja Dove', to: 'Oligarch' },
  { slug: 'elysium-roja-dove', from: 'Elysium Roja Dove', to: 'Elysium' },
  { slug: 'isola-blu-roja-dove', from: 'Isola Blu Roja Dove', to: 'Isola Blu' },
  {
    slug: 'oud-for-greatness-neo-initio-parfums-prives',
    from: 'Oud for Greatness Neo Initio Parfums Prives',
    to: 'Oud for Greatness Neo',
  },
  {
    slug: 'oud-for-greatness-initio-parfums-prives',
    from: 'Oud for Greatness Initio Parfums Prives',
    to: 'Oud for Greatness',
  },
  { slug: 'paragon-initio-parfums-prives', from: 'Paragon Initio Parfums Prives', to: 'Paragon' },
  {
    slug: 'narcotic-delight-initio-parfums-prives',
    from: 'Narcotic Delight Initio Parfums Prives',
    to: 'Narcotic Delight',
  },
  {
    slug: 'musk-therapy-initio-parfums-prives',
    from: 'Musk Therapy Initio Parfums Prives',
    to: 'Musk Therapy',
  },
  { slug: 'rehab-initio-parfums-prives', from: 'Rehab Initio Parfums Prives', to: 'Rehab' },
  {
    slug: 'jazz-club-maison-martin-margiela',
    from: 'Jazz Club Maison Martin Margiela',
    to: 'Jazz Club',
  },
  {
    slug: 'replica-lazy-sunday-morning-maison-martin-margiela',
    from: 'Replica Lazy Sunday Morning Maison Martin Margiela',
    to: 'Replica Lazy Sunday Morning',
  },
  { slug: 'id-le-lanc-me', from: 'Idôle Lancôme', to: 'Idôle' },
  { slug: 'french-lover', from: 'French Lover Frederic Malle', to: 'French Lover' },
  { slug: 'accento-sospiro-perfumes', from: 'Accento Sospiro Perfumes', to: 'Accento' },
  { slug: 'white-lacoste-fragrances', from: 'White Lacoste Fragrances', to: 'White' },
  { slug: 'light-blue', from: 'Light Blue Dolce&Gabbana', to: 'Light Blue' },

  // ---- "<Name> by <Brand>" truncated after the "by" ----
  { slug: 'fugazzi-by', from: 'FUGAZZI by', to: 'Fugazzi' },
  { slug: 'angels-share-by', from: "Angels' Share By", to: "Angels' Share" },
  {
    slug: 'angels-share-paradis-by',
    from: "Angels' Share Paradis By",
    to: "Angels' Share Paradis",
  },
  { slug: 'good-girl-gone-bad-by', from: 'Good Girl Gone Bad By', to: 'Good Girl Gone Bad' },
  {
    slug: 'good-girl-gone-bad-extreme-by',
    from: 'Good Girl Gone Bad Extreme By',
    to: 'Good Girl Gone Bad Extreme',
  },
  { slug: 'love-don-t-be-shy-by', from: "Love Don't Be Shy By", to: "Love Don't Be Shy" },
  { slug: 'roses-on-ice-by', from: 'Roses on Ice By', to: 'Roses on Ice' },
  {
    slug: 'i-don-t-need-a-prince-rose-de-mai-by',
    from: "I Don't Need A Prince - Rose de Mai By",
    to: "I Don't Need A Prince - Rose de Mai",
  },
  { slug: 'l-heure-verte-by', from: "L'Heure Verte By", to: "L'Heure Verte" },
  { slug: 'straight-to-heaven-by', from: 'Straight to Heaven By', to: 'Straight to Heaven' },
  { slug: 'princess-by', from: 'Princess By', to: 'Princess' },
  { slug: 'apple-brandy-by', from: 'Apple Brandy By', to: 'Apple Brandy' },
  {
    slug: 'playing-with-the-devil-by',
    from: 'Playing With The Devil By',
    to: 'Playing With The Devil',
  },
  { slug: 'black-phantom-by', from: 'Black Phantom By', to: 'Black Phantom' },
  { slug: 'rolling-in-love-by', from: 'Rolling in Love By', to: 'Rolling in Love' },
  { slug: 'smoking-hot-by', from: 'Smoking Hot By', to: 'Smoking Hot' },
  { slug: 'moonlight-in-heaven-by', from: 'Moonlight in Heaven By', to: 'Moonlight in Heaven' },
  {
    slug: 'blue-moon-ginger-dash-by',
    from: 'Blue Moon Ginger Dash By',
    to: 'Blue Moon Ginger Dash',
  },

  // ---- shouting, whispering, or carrying a description ----
  // Casa Tito sets its name in capitals on the bottle; every other row in the
  // catalogue is title case, and the grid is where that has to agree.
  { slug: 'lunario', from: 'LUNARIO', to: 'Lunario' },
  { slug: 'vanoria', from: 'VANORIA', to: 'Vanoria' },
  { slug: 'muscavilla', from: 'MUSCAVILLA', to: 'Muscavilla' },
  { slug: 'lost-cherry-5', from: 'lost cherry', to: 'Lost Cherry' },
  // "mixture of fragrant substances" is what the customs form calls it.
  { slug: 'lost-cherry-3', from: 'смесь душистых веществ LOST CHERRY', to: 'Lost Cherry' },

  // ---- accents the scrape dropped ----
  // Each of these already sits beside a row that spells it correctly, except
  // Armani's Sì, where the grave accent is the whole name.
  { slug: 'bois-imperial', from: 'Bois Imperial', to: 'Bois Impérial' },
  { slug: 'n4-apres-l-amour', from: 'N4 Apres l’Amour', to: 'N4 Après l’Amour' },
  { slug: 'si', from: 'Si', to: 'Sì' },

  // ---- Chanel's Bleu, stored twice and broken both times ----
  // 2023 parfum and 2014 eau de parfum: the same fragrance in two
  // concentrations, so both carry the same name and the pair is reported with
  // the other duplicates rather than resolved here.
  { slug: 'bleu-de', from: 'Bleu de', to: 'Bleu de Chanel' },
  { slug: 'blue', from: 'blue', to: 'Bleu de Chanel' },

  // ---- Zielinski & Rozen name their fragrances after the notes ----
  {
    slug: 'black-pepper-amber-neroli',
    from: 'Black Pepper & Amber, Neroli',
    to: 'Black Pepper, Amber, Neroli',
  },
  {
    slug: 'black-pepper-amber-neroli-2',
    from: 'Black pepper, amber, neroli',
    to: 'Black Pepper, Amber, Neroli',
  },
];
