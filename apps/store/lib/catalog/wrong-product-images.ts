// Product photographs that show a different perfume than the one they are on.
//
// The shop's product images came over from Spree, attached by `viewable_id`,
// and `scripts/mirror-prod-images.ts` keeps only the storage segment of each
// filename — so nothing in the data records where a photo came from or what it
// depicts. The only way to find a wrong one is to look at it, which is what was
// done: all 461 images were rendered onto contact sheets captioned with the
// brand and product they are attached to, and the 39 below did not match.
//
// Most of them are clone houses — OAKCHA above all, then Maison Alhambra,
// dossier., Alexandria, VERSET, POSH, DILÍS. Somebody photographed the cheap
// copy and filed it under the original's name. That is worse than an empty
// frame: a customer looking at Tom Ford Tobacco Vanille is being shown an
// OAKCHA bottle, and whichever way they read that, the page is lying.
//
// The pair is (slug, url), not the slug alone. Deleting by slug would also
// throw away a correct photograph uploaded later; matching the exact file means
// this can be re-run after an import without touching new work.
//
// `scripts/purge-wrong-product-images.ts` applies it. Re-run after
// `import-prod.ts`, which brings the wrong files back.

export interface WrongProductImage {
  readonly slug: string;
  /** What the photograph actually shows. */
  readonly shows: string;
  readonly url: string;
}

export const WRONG_PRODUCT_IMAGES: readonly WrongProductImage[] = [
  { slug: 'hayati', shows: 'GLAMFUME', url: '/products/prod/7txwkr7pmep00f47vilr2x5wc1uw.jpg' },
  { slug: 'hayati-2', shows: 'GLAMFUME', url: '/products/prod/o1vfcwcz9vinq2a70z0xtnr8xpos.jpg' },
  {
    slug: 'angel-s-share',
    shows: 'ARLYN Warm Spicy',
    url: '/products/prod/dd45vjjy7h19flb92kher7i85fbq.jpg',
  },
  {
    slug: 'love-don-t-be-shy-by',
    shows: 'OAKCHA Sweet Addict',
    url: '/products/prod/onjrzt6lbsbai8hiab2rof1dmz4a.jpg',
  },
  {
    slug: 'love-don-t-by-shy',
    shows: 'OAKCHA Sweet Addict',
    url: '/products/prod/80euup4d2068wd4f38pkiyjkdc0l.jpg',
  },
  {
    slug: 'bal-d-afrique',
    shows: 'OAKCHA Gold Gem',
    url: '/products/prod/gxpqrudnzbcbbrmttdfoqg18yaog.jpg',
  },
  {
    slug: 'gypsy-water',
    shows: 'OAKCHA Morning Rain',
    url: '/products/prod/elyouc5yb0hgx8gxgwkk695omk9r.jpg',
  },
  {
    slug: 'mojave-ghost',
    shows: 'OAKCHA Desert Glass',
    url: '/products/prod/hv13557wr5lm8pqrho3l7jg0we2o.jpg',
  },
  {
    slug: 'ecstasy',
    shows: 'BIBBI Iris Wallpaper',
    url: '/products/prod/edz7hcucxtkfggh0l5n0xe9b001o.jpg',
  },
  {
    slug: 'mefisto-casa-moratti',
    shows: 'LOEWE Esencia Femme',
    url: '/products/prod/sll03tjeeaal2is38ob14463x320.jpg',
  },
  {
    slug: 'mefisto-gentiluomo-xerjoff',
    shows: 'BŌ Casa Blanca',
    url: '/products/prod/j1tcatwnqq6knmb3vr05g3wsqrp3.jpg',
  },
  {
    slug: 'bleu-de',
    shows: 'dossier. Citrus Ginger',
    url: '/products/prod/9ruttnriqazj0hbzjmitsqonjalp.jpg',
  },
  {
    slug: 'aventus-man',
    shows: 'VERSET Choice',
    url: '/products/prod/q4996v7nusvttzjt1e56xsydzyx3.jpg',
  },
  {
    slug: 'silver-mountain',
    shows: 'GUSTA / Maison Alhambra',
    url: '/products/prod/60p0uek8upe4rlyr7axpp34y75qa.jpg',
  },
  {
    slug: 'silver-mountain-water',
    shows: 'GUSTA / Maison Alhambra',
    url: '/products/prod/4zt8vvv8a67mfgyvz6fe0dlhdvr9.jpg',
  },
  {
    slug: 'molecule-01',
    shows: 'OAKCHA Body Scent',
    url: '/products/prod/r2f1b4ih5rg0fmfjb9i3dp2fz8ep.jpg',
  },
  {
    slug: 'oudgasm-vanilla-oud-36',
    shows: 'nothing — the file is missing',
    url: '/products/prod/ozw9yfg65vuhphowgoln6hrddpxq.jpg',
  },
  {
    slug: 'chanel-bleu-220-ml',
    shows: 'dossier. Citrus Ginger',
    url: '/products/prod/w5ixvgkm1xinps97rqqnudzbo655.jpg',
  },
  {
    slug: 'tendre',
    shows: 'CHANEL Chance Eau Vive',
    url: '/products/prod/fprn2vkoyo9qyx6gmlcti4d21l2l.jpg',
  },
  {
    slug: 'another-13',
    shows: 'VOLUSPA Linden & Dark Moss',
    url: '/products/prod/8x4v96ivoagwu7r0olmx2w16w5cr.jpg',
  },
  {
    slug: 'another-13-2',
    shows: 'OAKCHA Parallel',
    url: '/products/prod/7wnljyegjql9gpcmmubw78fzt4jv.jpg',
  },
  {
    slug: 'afternoon-swim-2',
    shows: 'OAKCHA Gypsy Beats',
    url: '/products/prod/o0l6llzjcb9pw23all49cc3wh44y.jpg',
  },
  {
    slug: 'imagination',
    shows: 'ARABYAT Marwa',
    url: '/products/prod/srno3gg8pad00ortn9pav4alh2an.jpg',
  },
  {
    slug: 'ombre-nomade',
    shows: 'OAKCHA Dune Dance',
    url: '/products/prod/mzzn7efl6g9inuygacgrqiirvxqp.jpg',
  },
  {
    slug: 'grand-soir-maison',
    shows: 'ALEXANDRIA Paris Night',
    url: '/products/prod/wr1nbjwmui718u8zhn19c7wq9ytt.jpg',
  },
  {
    slug: 'oud-satin-mood-maison',
    shows: 'DKNY',
    url: '/products/prod/knrxrn1waidk0oiwh7wqe5xrlc8x.jpg',
  },
  {
    slug: 'delina',
    shows: 'OAKCHA Madame Rose',
    url: '/products/prod/l6p7fjez18ov98ofwf8fqoni3gno.jpg',
  },
  { slug: 'sedley', shows: 'POSH Sirius', url: '/products/prod/e4kekv1ry5dv8getkxb6e80gkdbw.jpg' },
  {
    slug: 'aoud-roja-dove',
    shows: 'DIVIN AOUD',
    url: '/products/prod/3azdcoildpzw5ydk19haczw1kztl.jpg',
  },
  {
    slug: 'gumin',
    shows: 'unrelated pink handbag bottle',
    url: '/products/prod/m82uu0vfv9wo3ll984kw5yjj64w5.jpg',
  },
  {
    slug: 'gumin-2',
    shows: 'GUSTA / Maison Alhambra',
    url: '/products/prod/s98kauh5zpa7ox7npuz54533w24j.jpg',
  },
  {
    slug: 'kirke',
    shows: 'DILÍS Muse Nectar',
    url: '/products/prod/7sd4oi614xgf9gjx46zkvuq340ud.jpg',
  },
  {
    slug: 'cherry-smoke',
    shows: 'OAKCHA Sinful Smoke',
    url: '/products/prod/2zqpjud5x5tzgenwl5tqp4fftpok.jpg',
  },
  {
    slug: 'smoke-cherry',
    shows: 'OAKCHA Sinful Smoke',
    url: '/products/prod/874q1l2gzw4dbdivr5n8h7pto3bo.jpg',
  },
  {
    slug: 'tobacco-oud',
    shows: 'OAKCHA Aged Tobacco',
    url: '/products/prod/dqi7l329fcwlpmppetpfvto4yi7m.jpg',
  },
  {
    slug: 'tobacco-vanille',
    shows: 'OAKCHA Torrid Day',
    url: '/products/prod/7r8va8851qu9danqa0gk0ovrrdl3.jpg',
  },
  {
    slug: 'dear-polly',
    shows: 'LA RIVE Best for man',
    url: '/products/prod/pukhs3ny1mm66a5u69lp6eo4tsyp.jpg',
  },
  {
    slug: 'erba-pura',
    shows: 'OAKCHA Sarang',
    url: '/products/prod/ch7ffaccm0myglodi0daoqofhf2u.jpg',
  },
  {
    slug: 'erba-pura-2',
    shows: 'OAKCHA Sarang',
    url: '/products/prod/381nffcozunyczf09ahbg25yzadz.jpg',
  },
];
