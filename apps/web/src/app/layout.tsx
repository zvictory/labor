import type { ReactNode } from 'react';
import { robotoSlab, storyScript } from '@/lib/fonts';
import { cn } from '@/lib/cn';
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
      className={cn(robotoSlab.variable, storyScript.variable)}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
