'use client';

import { useState } from 'react';
import Image from 'next/image';

interface GalleryImage {
  url: string;
  alt: string;
}

interface Props {
  images: GalleryImage[];
  productName: string;
}

export const ProductGallery = ({ images, productName }: Props) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = images[activeIdx] ?? images[0];
  if (!active) return null;

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-50 dark:bg-stone-900 border border-border/40 shadow-sm">
        <Image
          src={active.url}
          alt={active.alt || productName}
          fill
          priority
          sizes="(min-width:768px) 50vw, 100vw"
          className="object-contain p-6"
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.slice(0, 4).map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`Show image ${i + 1} of ${productName}`}
              aria-current={i === activeIdx}
              className={`relative aspect-square overflow-hidden rounded-lg bg-stone-50 dark:bg-stone-900 border transition ${
                i === activeIdx
                  ? 'border-brass ring-2 ring-brass/40'
                  : 'border-border/30 hover:border-border/60'
              }`}
            >
              <Image src={img.url} alt={img.alt} fill sizes="120px" className="object-contain p-2" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
