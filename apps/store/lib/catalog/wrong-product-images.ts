// Product photographs that show a different perfume than the one they are on.
//
// The shop's product images came over from Spree, attached by `viewable_id`.
// Nothing in the data records what a photograph depicts, so the only way to
// find a wrong one is to look at it, which is what was done: all 461 images
// were rendered onto contact sheets captioned with the brand and product they
// are attached to, and the 39 below did not match.
//
// Most of them are clone houses — OAKCHA above all, then Maison Alhambra,
// dossier., Alexandria, VERSET, POSH, DILÍS. Somebody photographed the cheap
// copy and filed it under the original's name. That is worse than an empty
// frame: a customer looking at Tom Ford Tobacco Vanille is being shown an
// OAKCHA bottle, and whichever way they read that, the page is lying.
//
// The identity is the ActiveStorage key, not the url. Production stores
// `https://laborparfum.com/storage/<key>/fimgs-126803-thumb.jpg` and the local
// mirror rewrites the same file to `/products/prod/<key>.jpg`, so a manifest
// keyed on the url matched locally and silently deleted nothing on prod. The
// key is what both have in common.
//
// It is paired with the slug rather than used alone: deleting by slug would
// also throw away a correct photograph uploaded later, and matching the exact
// file means this can be re-run after an import without touching new work.
//
// `scripts/purge-wrong-product-images.ts` applies it. Re-run after
// `import-prod.ts`, which brings the wrong files back.

export interface WrongProductImage {
  readonly slug: string;
  /** What the photograph actually shows. */
  readonly shows: string;
  /** ActiveStorage key — the segment both the prod url and the local mirror carry. */
  readonly storageKey: string;
}

export const WRONG_PRODUCT_IMAGES: readonly WrongProductImage[] = [
  { slug: 'hayati', shows: 'GLAMFUME', storageKey: '7txwkr7pmep00f47vilr2x5wc1uw' },
  { slug: 'hayati-2', shows: 'GLAMFUME', storageKey: 'o1vfcwcz9vinq2a70z0xtnr8xpos' },
  { slug: 'angel-s-share', shows: 'ARLYN Warm Spicy', storageKey: 'dd45vjjy7h19flb92kher7i85fbq' },
  {
    slug: 'love-don-t-be-shy-by',
    shows: 'OAKCHA Sweet Addict',
    storageKey: 'onjrzt6lbsbai8hiab2rof1dmz4a',
  },
  {
    slug: 'love-don-t-by-shy',
    shows: 'OAKCHA Sweet Addict',
    storageKey: '80euup4d2068wd4f38pkiyjkdc0l',
  },
  { slug: 'bal-d-afrique', shows: 'OAKCHA Gold Gem', storageKey: 'gxpqrudnzbcbbrmttdfoqg18yaog' },
  { slug: 'gypsy-water', shows: 'OAKCHA Morning Rain', storageKey: 'elyouc5yb0hgx8gxgwkk695omk9r' },
  {
    slug: 'mojave-ghost',
    shows: 'OAKCHA Desert Glass',
    storageKey: 'hv13557wr5lm8pqrho3l7jg0we2o',
  },
  { slug: 'ecstasy', shows: 'BIBBI Iris Wallpaper', storageKey: 'edz7hcucxtkfggh0l5n0xe9b001o' },
  {
    slug: 'mefisto-casa-moratti',
    shows: 'LOEWE Esencia Femme',
    storageKey: 'sll03tjeeaal2is38ob14463x320',
  },
  {
    slug: 'mefisto-gentiluomo-xerjoff',
    shows: 'BŌ Casa Blanca',
    storageKey: 'j1tcatwnqq6knmb3vr05g3wsqrp3',
  },
  { slug: 'bleu-de', shows: 'dossier. Citrus Ginger', storageKey: '9ruttnriqazj0hbzjmitsqonjalp' },
  { slug: 'aventus-man', shows: 'VERSET Choice', storageKey: 'q4996v7nusvttzjt1e56xsydzyx3' },
  {
    slug: 'silver-mountain',
    shows: 'GUSTA / Maison Alhambra',
    storageKey: '60p0uek8upe4rlyr7axpp34y75qa',
  },
  {
    slug: 'silver-mountain-water',
    shows: 'GUSTA / Maison Alhambra',
    storageKey: '4zt8vvv8a67mfgyvz6fe0dlhdvr9',
  },
  { slug: 'molecule-01', shows: 'OAKCHA Body Scent', storageKey: 'r2f1b4ih5rg0fmfjb9i3dp2fz8ep' },
  {
    slug: 'oudgasm-vanilla-oud-36',
    shows: 'nothing — the file is missing',
    storageKey: 'ozw9yfg65vuhphowgoln6hrddpxq',
  },
  {
    slug: 'chanel-bleu-220-ml',
    shows: 'dossier. Citrus Ginger',
    storageKey: 'w5ixvgkm1xinps97rqqnudzbo655',
  },
  { slug: 'tendre', shows: 'CHANEL Chance Eau Vive', storageKey: 'fprn2vkoyo9qyx6gmlcti4d21l2l' },
  {
    slug: 'another-13',
    shows: 'VOLUSPA Linden & Dark Moss',
    storageKey: '8x4v96ivoagwu7r0olmx2w16w5cr',
  },
  { slug: 'another-13-2', shows: 'OAKCHA Parallel', storageKey: '7wnljyegjql9gpcmmubw78fzt4jv' },
  {
    slug: 'afternoon-swim-2',
    shows: 'OAKCHA Gypsy Beats',
    storageKey: 'o0l6llzjcb9pw23all49cc3wh44y',
  },
  { slug: 'imagination', shows: 'ARABYAT Marwa', storageKey: 'srno3gg8pad00ortn9pav4alh2an' },
  { slug: 'ombre-nomade', shows: 'OAKCHA Dune Dance', storageKey: 'mzzn7efl6g9inuygacgrqiirvxqp' },
  {
    slug: 'grand-soir-maison',
    shows: 'ALEXANDRIA Paris Night',
    storageKey: 'wr1nbjwmui718u8zhn19c7wq9ytt',
  },
  { slug: 'oud-satin-mood-maison', shows: 'DKNY', storageKey: 'knrxrn1waidk0oiwh7wqe5xrlc8x' },
  { slug: 'delina', shows: 'OAKCHA Madame Rose', storageKey: 'l6p7fjez18ov98ofwf8fqoni3gno' },
  { slug: 'sedley', shows: 'POSH Sirius', storageKey: 'e4kekv1ry5dv8getkxb6e80gkdbw' },
  { slug: 'aoud-roja-dove', shows: 'DIVIN AOUD', storageKey: '3azdcoildpzw5ydk19haczw1kztl' },
  {
    slug: 'gumin',
    shows: 'unrelated pink handbag bottle',
    storageKey: 'm82uu0vfv9wo3ll984kw5yjj64w5',
  },
  { slug: 'gumin-2', shows: 'GUSTA / Maison Alhambra', storageKey: 's98kauh5zpa7ox7npuz54533w24j' },
  { slug: 'kirke', shows: 'DILÍS Muse Nectar', storageKey: '7sd4oi614xgf9gjx46zkvuq340ud' },
  {
    slug: 'cherry-smoke',
    shows: 'OAKCHA Sinful Smoke',
    storageKey: '2zqpjud5x5tzgenwl5tqp4fftpok',
  },
  {
    slug: 'smoke-cherry',
    shows: 'OAKCHA Sinful Smoke',
    storageKey: '874q1l2gzw4dbdivr5n8h7pto3bo',
  },
  { slug: 'tobacco-oud', shows: 'OAKCHA Aged Tobacco', storageKey: 'dqi7l329fcwlpmppetpfvto4yi7m' },
  {
    slug: 'tobacco-vanille',
    shows: 'OAKCHA Torrid Day',
    storageKey: '7r8va8851qu9danqa0gk0ovrrdl3',
  },
  { slug: 'dear-polly', shows: 'LA RIVE Best for man', storageKey: 'pukhs3ny1mm66a5u69lp6eo4tsyp' },
  { slug: 'erba-pura', shows: 'OAKCHA Sarang', storageKey: 'ch7ffaccm0myglodi0daoqofhf2u' },
  { slug: 'erba-pura-2', shows: 'OAKCHA Sarang', storageKey: '381nffcozunyczf09ahbg25yzadz' },
];
