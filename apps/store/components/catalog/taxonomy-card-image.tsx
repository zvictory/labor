import Image from 'next/image';
import type { ReactNode } from 'react';

type Props = {
  src?: string;
  alt: string;
  fallback: ReactNode;
  mode?: 'contain' | 'cover';
};

export function TaxonomyCardImage({ src, alt, fallback, mode = 'contain' }: Props) {
  return (
    // No radius, no tinted plate, no bottom margin: the card that owns this
    // supplies its own frame and spacing, so the image is just the image.
    <div className="bg-background relative flex aspect-[4/3] items-center justify-center overflow-hidden">
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width:1024px) 20vw, 50vw"
          className={mode === 'cover' ? 'object-cover' : 'object-contain p-3'}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
