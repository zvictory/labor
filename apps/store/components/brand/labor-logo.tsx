import Image from 'next/image';

/** Shared outlined Story Script wordmark; source font is licensed in public/fonts. */
export function LaborLogo({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/brand/labor-wordmark.svg"
      alt="Labor"
      width={267}
      height={97}
      priority
      className={`h-10 w-auto md:h-12 dark:invert ${className}`}
    />
  );
}
