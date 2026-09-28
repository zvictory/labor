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
// A second pass (2026-09-28) set each photograph beside the perfume's own
// picture on Fragrantica and found 37 more, and that the first pass had fixed
// angel-s-share with Angels' Share Paradis. Two in three are the right house
// with the wrong perfume — a flanker (Absolute, Intense, Neo, Extreme, Paradis)
// or a sibling — which a caption naming the brand cannot catch; nine are clones
// again. The Spree manifest held 24 of those ids; ten were uploaded with none.
// Nine more had no verified picture to put in their place and lose theirs.
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
// `scripts/fix-wrong-product-images.ts` applies it. Re-run after
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
    fragranticaId: 62615,
  }, // the first fix used 101629, which is Angels' Share Paradis
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

  // Second pass, 2026-09-28.
  {
    slug: 'amber-wood',
    shows: 'Ajmal Oud on the Rocks',
    storageKey: 'cq46kv4ivuq17ylxxjtvcl6yi7o4',
    fragranticaId: 26016,
  },
  {
    slug: 'guidance',
    shows: 'Maori Collection Guilty Pleasure',
    storageKey: 'x1kkrptjzunffnzfdz5a2v4ma293',
    fragranticaId: 78656,
  },
  {
    slug: 'interlude-man',
    shows: 'Abraaj Valour 50',
    storageKey: '4htxqweg72cz5no5e1ntklh65dn1',
    fragranticaId: 15294,
  },
  {
    slug: 'angels-share-by',
    shows: "By Kilian Angels' Share Paradis",
    storageKey: 'om8w09tn0hfwf7tpa66jzj2amz0w',
    fragranticaId: 62615,
  },
  {
    slug: 'marijuana',
    shows: 'Byredo Open Sky',
    storageKey: '2sp41hj7eh5kbe0287cozo11t0fj',
    fragranticaId: 50002,
  }, // Kolmaz Marijuana; filed under Byredo, which has no perfume of that name
  {
    slug: '212-men',
    shows: 'Carolina Herrera 212 MTV edition',
    storageKey: 'cnog07v01psnqsegdbow3sk8tjf8',
    fragranticaId: 297,
  },
  {
    slug: 'allure-homme-sport',
    shows: 'Chanel Allure Homme Sport Eau Extrême',
    storageKey: '1z3dui95ke3gaq91fjzltafs3yeq',
    fragranticaId: 607,
  },
  {
    slug: 'cuir-infrarouge-maison-crivelli',
    shows: 'Clive Christian Blonde Amber',
    storageKey: '4hlstd1a8zch0ta4s3j0ltmb1i33',
    fragranticaId: 96781,
  }, // filed under Clive Christian; Cuir InfraRouge is Maison Crivelli's
  {
    slug: 'aventus',
    shows: 'Creed Aventus for Her',
    storageKey: 'ogtukp4h1y9d17w9af9qzx0fhs0f',
    fragranticaId: 9828,
  },
  {
    slug: 'fahrenheit',
    shows: 'Dior Fahrenheit Absolute',
    storageKey: 'jm1gcbcyv8kdg445n0x1ia1re3q6',
    fragranticaId: 228,
  },
  {
    slug: 'fahrenheit-32',
    shows: 'Dior Fahrenheit Absolute',
    storageKey: 's2ytx77y4pwoy3nn4ss6ocl6dul7',
    fragranticaId: 987,
  },
  {
    slug: 'escentric-01',
    shows: 'Escentric Molecules Molecule 01 + Ginger',
    storageKey: 'f0ikifl3j6lkfju70tp29rbxi2pn',
    fragranticaId: 846,
  },
  {
    slug: 'bois-imperial',
    shows: 'Essential Parfums Bois Impérial hair & body mist',
    storageKey: '735601mxxye1or6bpzdl2jcafxij',
    fragranticaId: 64338,
  },
  {
    slug: 'blue-talisman',
    shows: 'Fragrance World Blue Magician',
    storageKey: 's2ed1tfdgcyt0glwslqhaxxyp12o',
    fragranticaId: 84224,
  },
  {
    slug: 'emporio-armani-stronger-with-you',
    shows: 'Emporio Armani Stronger With You Spices',
    storageKey: 'rec957jcv4lleoasn9adv1yi6c0j',
    fragranticaId: 45258,
  },
  {
    slug: 'si',
    shows: "a clone labelled 'iS' Eau de Parfum Intense",
    storageKey: 'rknirlyuwv9gxpq9f1szpfgji9ug',
    fragranticaId: 18453,
  },
  {
    slug: 'the-voice-of-the-snake-parfum',
    shows: 'Gucci A Song for the Rose',
    storageKey: 'pezx88nfkdu58nuprikuka739k19',
    fragranticaId: 53088,
  },
  {
    slug: 'herbes-troublantes',
    shows: 'Guerlain Liu',
    storageKey: 'q4iqvu31uzn2yzmpwfurb50mzvjj',
    fragranticaId: 69275,
  },
  {
    slug: 'terre-d',
    shows: "Hermès Terre d'Hermès Eau de Parfum Intense",
    storageKey: '4opcna5txvv1yw8e8t5wnb6057ft',
    fragranticaId: 17,
  },
  {
    slug: 'oud-for-greatness-initio-parfums-prives',
    shows: 'Initio Oud for Greatness Neo',
    storageKey: 'gqi5vwesak0n1ddwyvbb03b23x1u',
    fragranticaId: 53641,
  },
  {
    slug: 'oud-for-happiness',
    shows: 'a clone labelled Happiness Oud',
    storageKey: 'fb1jr38p8wb968hcb7iz2948qnz7',
    fragranticaId: 69224,
  },
  {
    slug: 'cactus-garden',
    shows: 'Louis Vuitton Afternoon Swim',
    storageKey: '11sdi5u0ja94kbyycidalquczqrr',
    fragranticaId: 53946,
  },
  {
    slug: 'ganymede',
    shows: 'Fragrance World Grandeur',
    storageKey: 'kllss9kyyh1pmgro1odbkaocrkf3',
    fragranticaId: 54720,
  },
  {
    slug: 'intense-cafe',
    shows: 'Montale Arabians Rose Leather',
    storageKey: 'dtle0futaa5q0u32w9dspv43zzoo',
    fragranticaId: 18021,
  },
  {
    slug: 'hacivat',
    shows: 'Nishane Hacivat X',
    storageKey: 'l528vpz5v5wea7npr3egc4mg461w',
    fragranticaId: 44174,
  },
  {
    slug: 'montabaco',
    shows: 'Ormonde Jayne Montabaco Rio',
    storageKey: '4snwz0b9j3ky9a9s3ofi75a2v4ii',
    fragranticaId: 16896,
  },
  {
    slug: 'montabaco-2',
    shows: 'Ormonde Jayne Montabaco Rio',
    storageKey: '5pkrltcmmdb6o4wbx3ftiwi96xr1',
    fragranticaId: 16896,
  },
  {
    slug: 'megamare',
    shows: 'a bottle labelled Aqua Pura',
    storageKey: 'hd3ukd7re9nczaieicgylp4xog05',
    fragranticaId: 53471,
  },
  {
    slug: 'l-air-du-desert-marocain',
    shows: "Tauer L'Air du Désert Marocain Noir",
    storageKey: '1f1xrqaubdq42zjt699a0mzdknpc',
    fragranticaId: 4573,
  },
  {
    slug: 'electric-cherry',
    shows: 'a clone labelled Cherry Buzz',
    storageKey: 'f6bqry8sg04x1yiyqqx9f49xqyom',
    fragranticaId: 78583,
  },
  {
    slug: 'noir',
    shows: 'Tom Ford Noir Extreme',
    storageKey: 'ern7mcp4cp6u5x04es2pgk9bz8ol',
    fragranticaId: 15727,
  },
  {
    slug: 'ombre-leather',
    shows: 'a clone labelled Cuir Leather',
    storageKey: 'f1epnis9aya3j4brqwcuw4o6pvsd',
    fragranticaId: 50239,
  },
  {
    slug: 'oud-wood',
    shows: 'Tom Ford Oud Wood Intense',
    storageKey: '96bvkbiyi333m1k7gdety4isr454',
    fragranticaId: 1826,
  },
  {
    slug: 'bombshell',
    shows: "Victoria's Secret Bombshells in Bloom",
    storageKey: 'ooolsg7utgkg27efe22v8c2owk25',
    fragranticaId: 10190,
  },
  {
    slug: 'gran-ballo-casa-moratti',
    shows: 'Casamorati Renaissance',
    storageKey: 'b0h4cn5y33xqr6iudik3spvuqug6',
    fragranticaId: 26708,
  },
  {
    slug: 'la-tosca-casa-morati',
    shows: 'Xerjoff La Capitale',
    storageKey: 'zh9q5gfe237v7biuptxfsygg68ox',
    fragranticaId: 32191,
  },
  {
    slug: 'miss-dior-blooming-bouquet',
    shows: 'a Miss Dior bulldog collector bottle',
    storageKey: 'otrhoqrqfy9ne6hrph0pjptxsh1w',
    fragranticaId: 78945,
  },
  {
    slug: 'ecstasy-collection',
    shows: 'BIBBI Iris Wallpaper',
    storageKey: 'kn1tnjzbymcbka5utndz6zfim8f8',
    fragranticaId: null,
  }, // Casa Tito, a reseller label; no picture of its own anywhere
  {
    slug: 'euphoria-collection',
    shows: 'BŌ Casa Blanca',
    storageKey: 'vtn9f6cjoscayap3niw1swp7yxcv',
    fragranticaId: null,
  }, // Casa Tito, a reseller label
  {
    slug: 'eyphoria',
    shows: 'BŌ Casa Blanca',
    storageKey: 'puxnq62978as0k8wv6yedmuty98u',
    fragranticaId: null,
  }, // Casa Tito; a perfumed cream, not a spray
  {
    slug: 'muscavilla',
    shows: 'BŌ Casa Blanca',
    storageKey: 'eot83g1jmi5tfmtzk9bu6vs37ezl',
    fragranticaId: null,
  }, // Casa Tito, a reseller label
  {
    slug: 'vanoria',
    shows: 'BŌ Casa Blanca',
    storageKey: '2ymwrt0r00xmd6o4fz604wrosrk5',
    fragranticaId: null,
  }, // Casa Tito, a reseller label
  {
    slug: '50',
    shows: 'BOHOBOCO Plum Spray Paint',
    storageKey: '861lt8leas214px7hsp3hmc5nfbj',
    fragranticaId: null,
  }, // a Creation spray; no picture found
  {
    slug: '120',
    shows: 'Claiborne Mambo Mix',
    storageKey: '3nour23haezx7dyb18w42sk8s3s7',
    fragranticaId: null,
  }, // a 120 ml diffuser refill, not a perfume
  {
    slug: 'black-eyes',
    shows: 'Blackcliff Limewood',
    storageKey: '8s6wl90muyc04w1lyygruehmtzeb',
    fragranticaId: null,
  }, // Never Lies Black Eyes; no picture found
  {
    slug: 'town-country',
    shows: 'Clive Christian Matsukita',
    storageKey: 'f8v6zdst6lay20bhaly40kcno43d',
    fragranticaId: null,
  }, // Fragrantica's own picture for Town & Country shows Matsukita too
];
