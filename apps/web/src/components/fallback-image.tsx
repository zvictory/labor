'use client';

import { useState, useEffect } from 'react';
import Image, { type ImageProps } from 'next/image';

interface FallbackImageProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  fallback: React.ReactNode;
}

export function FallbackImage({ src, alt, fallback, ...props }: FallbackImageProps) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    return <>{fallback}</>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  );
}
