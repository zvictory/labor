// Product photographs that show a different perfume than the one they are on.
//
// The shop's product images came over from Spree, attached by `viewable_id`.
// All 461 were rendered onto contact sheets captioned with the brand and
// product they are attached to; the 39 below did not match. Most are clone
// houses — OAKCHA above all, then Maison Alhambra, dossier., Alexandria,
// VERSET, POSH, DILIS. Somebody photographed the cheap copy and filed it under
// the original's name.
//
// The cause was traceable in the end. `apps/backend/db/data/product_image_manifest.json`
// maps product -> Fragrantica id, and for 27 of these it holds the id of the
// clone: the image pipeline fetched exactly what it was told to. A block of
// consecutive ids around 92 900-93 100 accounts for most of them — one harvest
// run over an OAKCHA range, scattered across unrelated products.
//
// `fragranticaId` is the corrected id, read off the house's own Fragrantica
// designer page and then checked by eye against the downloaded picture. The
// file lives in public/products/fixed/<slug>.jpg, committed, so it does not
// depend on a third party staying up. Where it is null nothing verified: see
// the note on the entry.
//
// `storageKey` identifies the wrong file. Production stores the ActiveStorage
// url and the local mirror rewrites it, so the key is the part both carry;
// pairing it with the slug means a photograph added later is left alone.
//
// `scripts/purge-wrong-product-images.ts` applies it. Re-run after
// `import-prod.ts`, which brings the wrong files back.

export interface WrongProductImage {
  readonly slug: string;
  /** What the photograph actually shows. */
  readonly shows: string;
  /** ActiveStorage key of the wrong file — the segment both urls carry. */
  readonly storageKey: string;
  /** Verified Fragrantica id of the real perfume, or null when none was found. */
  readonly fragranticaId: number | null;
}

export const WRONG_PRODUCT_IMAGES: readonly WrongProductImage[] = [
  {
    slug: 'hayati',
    shows: 'GLAMFUME',
    storageKey: '7txwkr7pmep00f47vilr2x5wc1uw',
    fragranticaId: 50344,
  },
  {
    slug: 'hayati-2',
    shows: 'GLAMFUME',
    storageKey: 'o1vfcwcz9vinq2a70z0xtnr8xpos',
    fragranticaId: null,
  }, // a car perfume, not the Attar Collection bottle
  {
    slug: 'angel-s-share',
    shows: 'ARLYN Warm Spicy',
    storageKey: 'dd45vjjy7h19flb92kher7i85fbq',
    fragranticaId: 101629,
  },
  {
    slug: 'love-don-t-be-shy-by',
    shows: 'OAKCHA Sweet Addict',
    storageKey: 'onjrzt6lbsbai8hiab2rof1dmz4a',
    fragranticaId: 4322,
  },
  {
    slug: 'love-don-t-by-shy',
    shows: 'OAKCHA Sweet Addict',
    storageKey: '80euup4d2068wd4f38pkiyjkdc0l',
    fragranticaId: 4322,
  },
  {
    slug: 'bal-d-afrique',
    shows: 'OAKCHA Gold Gem',
    storageKey: 'gxpqrudnzbcbbrmttdfoqg18yaog',
    fragranticaId: 6458,
  },
  {
    slug: 'gypsy-water',
    shows: 'OAKCHA Morning Rain',
    storageKey: 'elyouc5yb0hgx8gxgwkk695omk9r',
    fragranticaId: 3575,
  },
  {
    slug: 'mojave-ghost',
    shows: 'OAKCHA Desert Glass',
    storageKey: 'hv13557wr5lm8pqrho3l7jg0we2o',
    fragranticaId: 27040,
  },
  {
    slug: 'ecstasy',
    shows: 'BIBBI Iris Wallpaper',
    storageKey: 'edz7hcucxtkfggh0l5n0xe9b001o',
    fragranticaId: null,
  }, // a body cream; no Fragrantica entry
  {
    slug: 'mefisto-casa-moratti',
    shows: 'LOEWE Esencia Femme',
    storageKey: 'sll03tjeeaal2is38ob14463x320',
    fragranticaId: null,
  }, // reseller name; not found under Xerjoff
  {
    slug: 'mefisto-gentiluomo-xerjoff',
    shows: 'BŌ Casa Blanca',
    storageKey: 'j1tcatwnqq6knmb3vr05g3wsqrp3',
    fragranticaId: null,
  }, // reseller name; not found under Xerjoff
  {
    slug: 'bleu-de',
    shows: 'dossier. Citrus Ginger',
    storageKey: '9ruttnriqazj0hbzjmitsqonjalp',
    fragranticaId: 9099,
  },
  {
    slug: 'aventus-man',
    shows: 'VERSET Choice',
    storageKey: 'q4996v7nusvttzjt1e56xsydzyx3',
    fragranticaId: 9828,
  },
  {
    slug: 'silver-mountain',
    shows: 'GUSTA / Maison Alhambra',
    storageKey: '60p0uek8upe4rlyr7axpp34y75qa',
    fragranticaId: 472,
  },
  {
    slug: 'silver-mountain-water',
    shows: 'GUSTA / Maison Alhambra',
    storageKey: '4zt8vvv8a67mfgyvz6fe0dlhdvr9',
    fragranticaId: 472,
  },
  {
    slug: 'molecule-01',
    shows: 'OAKCHA Body Scent',
    storageKey: 'r2f1b4ih5rg0fmfjb9i3dp2fz8ep',
    fragranticaId: 845,
  },
  {
    slug: 'oudgasm-vanilla-oud-36',
    shows: 'nothing — the file is missing',
    storageKey: 'ozw9yfg65vuhphowgoln6hrddpxq',
    fragranticaId: 85184,
  },
  {
    slug: 'chanel-bleu-220-ml',
    shows: 'dossier. Citrus Ginger',
    storageKey: 'w5ixvgkm1xinps97rqqnudzbo655',
    fragranticaId: null,
  }, // a 220 ml home spray, not the Chanel bottle
  {
    slug: 'tendre',
    shows: 'CHANEL Chance Eau Vive',
    storageKey: 'fprn2vkoyo9qyx6gmlcti4d21l2l',
    fragranticaId: 45092,
  },
  {
    slug: 'another-13',
    shows: 'VOLUSPA Linden & Dark Moss',
    storageKey: '8x4v96ivoagwu7r0olmx2w16w5cr',
    fragranticaId: 10131,
  },
  {
    slug: 'another-13-2',
    shows: 'OAKCHA Parallel',
    storageKey: '7wnljyegjql9gpcmmubw78fzt4jv',
    fragranticaId: 10131,
  },
  {
    slug: 'afternoon-swim-2',
    shows: 'OAKCHA Gypsy Beats',
    storageKey: 'o0l6llzjcb9pw23all49cc3wh44y',
    fragranticaId: 53947,
  },
  {
    slug: 'imagination',
    shows: 'ARABYAT Marwa',
    storageKey: 'srno3gg8pad00ortn9pav4alh2an',
    fragranticaId: 67370,
  },
  {
    slug: 'ombre-nomade',
    shows: 'OAKCHA Dune Dance',
    storageKey: 'mzzn7efl6g9inuygacgrqiirvxqp',
    fragranticaId: 49755,
  },
  {
    slug: 'grand-soir-maison',
    shows: 'ALEXANDRIA Paris Night',
    storageKey: 'wr1nbjwmui718u8zhn19c7wq9ytt',
    fragranticaId: 40816,
  },
  {
    slug: 'oud-satin-mood-maison',
    shows: 'DKNY',
    storageKey: 'knrxrn1waidk0oiwh7wqe5xrlc8x',
    fragranticaId: 30352,
  },
  {
    slug: 'delina',
    shows: 'OAKCHA Madame Rose',
    storageKey: 'l6p7fjez18ov98ofwf8fqoni3gno',
    fragranticaId: 43871,
  },
  {
    slug: 'sedley',
    shows: 'POSH Sirius',
    storageKey: 'e4kekv1ry5dv8getkxb6e80gkdbw',
    fragranticaId: 56273,
  },
  {
    slug: 'aoud-roja-dove',
    shows: 'DIVIN AOUD',
    storageKey: '3azdcoildpzw5ydk19haczw1kztl',
    fragranticaId: 17930,
  },
  {
    slug: 'gumin',
    shows: 'unrelated pink handbag bottle',
    storageKey: 'm82uu0vfv9wo3ll984kw5yjj64w5',
    fragranticaId: 40440,
  },
  {
    slug: 'gumin-2',
    shows: 'GUSTA / Maison Alhambra',
    storageKey: 's98kauh5zpa7ox7npuz54533w24j',
    fragranticaId: 40440,
  },
  {
    slug: 'kirke',
    shows: 'DILÍS Muse Nectar',
    storageKey: '7sd4oi614xgf9gjx46zkvuq340ud',
    fragranticaId: 32172,
  },
  {
    slug: 'cherry-smoke',
    shows: 'OAKCHA Sinful Smoke',
    storageKey: '2zqpjud5x5tzgenwl5tqp4fftpok',
    fragranticaId: 78578,
  },
  {
    slug: 'smoke-cherry',
    shows: 'OAKCHA Sinful Smoke',
    storageKey: '874q1l2gzw4dbdivr5n8h7pto3bo',
    fragranticaId: 78578,
  },
  {
    slug: 'tobacco-oud',
    shows: 'OAKCHA Aged Tobacco',
    storageKey: 'dqi7l329fcwlpmppetpfvto4yi7m',
    fragranticaId: 21402,
  },
  {
    slug: 'tobacco-vanille',
    shows: 'OAKCHA Torrid Day',
    storageKey: '7r8va8851qu9danqa0gk0ovrrdl3',
    fragranticaId: 1825,
  },
  {
    slug: 'dear-polly',
    shows: 'LA RIVE Best for man',
    storageKey: 'pukhs3ny1mm66a5u69lp6eo4tsyp',
    fragranticaId: 30928,
  },
  {
    slug: 'erba-pura',
    shows: 'OAKCHA Sarang',
    storageKey: 'ch7ffaccm0myglodi0daoqofhf2u',
    fragranticaId: 55157,
  },
  {
    slug: 'erba-pura-2',
    shows: 'OAKCHA Sarang',
    storageKey: '381nffcozunyczf09ahbg25yzadz',
    fragranticaId: 55157,
  },
];
