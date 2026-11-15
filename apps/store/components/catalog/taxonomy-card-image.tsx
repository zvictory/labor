import Image from 'next/image';
import type { ReactNode } from 'react';

type Props = {
  src?: string;
  alt: string;
  fallback: ReactNode;
  mode?: 'contain' | 'cover';
  portrait?: boolean;
};

export function TaxonomyCardImage({
  src,
  alt,
  fallback,
  mode = 'contain',
  portrait = false,
}: Props) {
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
          className={
            mode === 'cover'
              ? portrait
                ? 'object-cover object-top'
                : 'object-cover'
              : 'object-contain p-6 sm:p-8'
          }
        />
      ) : (
        fallback
      )}
    </div>
  );
}
