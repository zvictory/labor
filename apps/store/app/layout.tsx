import type { ReactNode } from 'react';
import { archivo, jetbrainsMono, newsreader, storyScript } from '@/lib/fonts';
import './globals.css';

export const metadata = {
  title: { default: 'Labor — Parfumerie', template: '%s · Labor' },
  description: 'Multi-brand niche & selective fragrance in Uzbekistan',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      suppressHydrationWarning
      className={`${archivo.variable} ${jetbrainsMono.variable} ${newsreader.variable} ${storyScript.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
