import { Archivo, JetBrains_Mono, Newsreader } from 'next/font/google';
import localFont from 'next/font/local';

// Brandbook Edition 02 — three faces, three jobs.
//   Archivo        UI, headings, buttons
//   JetBrains Mono codes, notes, tick labels, prices (tabular)
//   Newsreader     long reading — scent descriptions, story copy
//
// next/font/google self-hosts these at build time, so nothing is requested
// from Google at runtime (D4 requires self-hosting).
//
// Subsets are latin + latin-ext for now because the storefront is English-only
// (i18n/config.ts). When ru/uz come back, cyrillic must be added here AND the
// subset must cover U+02BB (oʻ, gʻ) or Uzbek text renders tofu.

export const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-archivo',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-newsreader',
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
