/** Reviewed spelling/synonym pairs only; distinct fragrance materials stay distinct. */
export const NOTE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  gaiac: 'guaiac-wood',
  litchi: 'lychee',
  blackcurrant: 'black-currant',
  citrus: 'citruses',
  'marine-notes': 'sea-notes',
  'woodsy-notes': 'woody-notes',
  vanila: 'vanilla',
  vanille: 'vanilla',
  'pine-tree': 'pine',
  'oak-moss': 'oakmoss',
  'sandal-mysore': 'mysore-sandalwood',
  olibanum: 'frankincense',
  tonka: 'tonka-bean',
  cardamon: 'cardamom',
  cloves: 'clove',
  'ebony-tree': 'ebony',
  'rose-de-mai': 'may-rose',
  rhuburb: 'rhubarb',
  'virginian-cedar': 'virginia-cedar',
  'aquatic-notes': 'water-notes',
  'watery-notes': 'water-notes',
  'vanilla-pod': 'vanilla-bean',
  vervain: 'verbena',
  sandal: 'sandalwood',
});

export const canonicalNoteSlug = (slug: string): string =>
  Object.hasOwn(NOTE_ALIASES, slug) ? NOTE_ALIASES[slug]! : slug;

export const noteSlugVariants = (slug: string): string[] => {
  const canonical = canonicalNoteSlug(slug);
  return [
    canonical,
    ...Object.keys(NOTE_ALIASES).filter((alias) => NOTE_ALIASES[alias] === canonical),
  ];
};
