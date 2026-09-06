// Labor's own goods, filed in the catalogue under the designer house whose
// fragrance they are built around.
//
// "Домашний парфюм Limmensite 220 ml" is a 220 ml room fragrance Labor sells,
// and it was stored under Louis Vuitton. "Гель для душа парфюмированный Black
// Afgano 300 гр" is a shower gel, stored under Nasomatto. Twenty-two rows are
// like this: home fragrance, car perfume, shower gel and 50 ml universal
// sprays, each carrying the brand of the perfume it references.
//
// This is not a typo. On a shop page the brand field is a statement about who
// made the thing, so as it stood the catalogue said Nasomatto makes this shower
// gel and Chanel makes this room spray. They are Labor's, and they say so now.
// The referenced fragrance stays in the product name, where it belongs and
// where it reads as a reference rather than a claim.
//
// Not in here, and left for the shop to decide:
//  - "Крем парфюмированный Ecstasy" and "Eyphoria" under Casa Tito. Casa Tito
//    sells its ECSTASY and EUPHORIA collections here as bottles, so a
//    perfumed cream under the same name may well be theirs.
//  - "Ароматическая свеча" and "спрей парфюм 50" under Creation, the diffuser
//    liquid under MIX, the Kalso bottles under okiii. None of those is a
//    designer house being spoken for; they may be real suppliers.
export interface ProductBrandFix {
  readonly slug: string;
  /** Brand slug the row must still carry for the fix to apply. */
  readonly from: string;
  readonly to: string;
}

export const PRODUCT_BRAND_FIXES: readonly ProductBrandFix[] = [
  // Домашний парфюм — 220 ml room fragrance
  { slug: 'chanel-chance-220-ml', from: 'chanel', to: 'labor' },
  { slug: 'chanel-sport-220-ml', from: 'chanel', to: 'labor' },
  { slug: 'creed-aventus-220-ml', from: 'creed', to: 'labor' },
  { slug: 'lelabo-santal-33-220-ml', from: 'le-labo', to: 'labor' },
  { slug: 'limmensite-220-ml', from: 'louis-vuitton', to: 'labor' },
  { slug: 'maison-baccarat-220-ml', from: 'maison-francis-kurkdjian', to: 'labor' },
  { slug: 'black-afgano-220-ml', from: 'nasomatto', to: 'labor' },
  { slug: 'uew-77664', from: 'hugo-boss', to: 'labor' },

  // Гель для душа — 300 g perfumed shower gel
  { slug: 'tygar-300', from: 'bvlgari', to: 'labor' },
  { slug: 'symphony-300', from: 'louis-vuitton', to: 'labor' },
  { slug: 'black-afgano-300', from: 'nasomatto', to: 'labor' },

  // Авто парфюм — car fragrance
  { slug: 'hayati-2', from: 'attar-collection', to: 'labor' },
  { slug: 'tygar-2', from: 'bvlgari', to: 'labor' },
  { slug: 'light-blue-2', from: 'dolce-gabbana', to: 'labor' },
  { slug: 'lost-cherry-2', from: 'tom-ford', to: 'labor' },
  { slug: 'mango-skin-2', from: 'vilhelm-parfumerie', to: 'labor' },

  // Универсальный парфюм — 50 ml
  { slug: 'good-girl-gone-bad-50-ml', from: 'by-kilian', to: 'labor' },
  { slug: 'sauvage-50-ml', from: 'dior', to: 'labor' },
  { slug: 'montabaco-50-ml', from: 'ormonde-jayne', to: 'labor' },
  { slug: 'ombre-leather-50-ml', from: 'tom-ford', to: 'labor' },
  { slug: 'tobacco-vanille-50-ml', from: 'tom-ford', to: 'labor' },

  // спрей парфюм
  { slug: 'atelier-cologne', from: 'atelier-cologne', to: 'labor' },
];
