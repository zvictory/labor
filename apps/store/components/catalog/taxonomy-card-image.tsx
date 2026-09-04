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
    <div className="relative mb-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-900">
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
