import Image from 'next/image';

import type { NotePicture } from '@/lib/catalog/note-picture';

// What sits inside the glass bead (glass-bead.ts), on the card orbit and on the
// product page alike: our own cut-out drawn whole, or a square photograph mirrored
// from Fragrantica clipped to the bead. No hooks, so a client component (the
// orbit) and a server component (the product page) can both render it.
export function NoteFace({ picture, sizes }: { picture: NotePicture; sizes: string }) {
  if (picture.cutout)
    return (
      <Image
        src={picture.src}
        alt=""
        width={256}
        height={256}
        sizes={sizes}
        className="relative size-full object-contain p-[6%] drop-shadow-[0_4px_5px_rgb(40_28_12/.22)]"
      />
    );

  return (
    <span className="absolute inset-[9%] overflow-hidden rounded-[50%]">
      <Image src={picture.src} alt="" fill sizes={sizes} className="object-cover" />
    </span>
  );
}
