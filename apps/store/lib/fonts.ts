import { Archivo, Golos_Text, JetBrains_Mono, Literata, Newsreader } from 'next/font/google';
import localFont from 'next/font/local';

// Brandbook Edition 02 — three faces, three jobs.
//   Archivo        UI, headings, buttons
//   JetBrains Mono codes, notes, tick labels, prices (tabular)
//   Newsreader     long reading — scent descriptions, story copy
//
// next/font/google self-hosts these at build time, so nothing is requested
// from Google at runtime (D4 requires self-hosting).
//
// Cyrillic. Archivo and Newsreader have none — Google ships them in latin,
// latin-ext and vietnamese only — so every Russian word on the site was drawn in
// whatever the device had. Each gets a Cyrillic companion that is loaded for
// the Cyrillic ranges alone: Golos Text beside Archivo, Literata beside
// Newsreader. The browser picks per character, so Latin stays in the brand face
// and Cyrillic falls through to the companion (tailwind.config.ts orders them).
//
// That fall-through only works if nothing sits between the two faces. next/font
// normally appends a size-adjusted local Arial/Times after each family, with no
// unicode-range, and that face would catch the Cyrillic first. So the brand
// faces are built with adjustFontFallback off; the companions keep theirs, last
// in the stack, where they belong.
//
// Uzbek needs U+02BB (oʻ, gʻ); Google's latin subset includes U+02BB–02BC.

export const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-archivo',
  display: 'swap',
  adjustFontFallback: false,
});

export const golosText = Golos_Text({
  subsets: ['cyrillic', 'cyrillic-ext'],
  variable: '--font-golos-text',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-newsreader',
  display: 'swap',
  adjustFontFallback: false,
});

export const literata = Literata({
  subsets: ['cyrillic', 'cyrillic-ext'],
  variable: '--font-literata',
  display: 'swap',
});

// Logotype only — never a page font. p.05/p.08: Story Script is reserved for
// the wordmark and the perfumer's signature. Still a .ttf here; the brandbook
// wants the wordmark shipped as outlined SVG instead (E9, third-party OFL face).
export const storyScript = localFont({
  src: '../public/fonts/StoryScript-Regular.ttf',
  variable: '--font-story-script',
  display: 'swap',
  weight: '400',
});
