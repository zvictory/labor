'use client';

import { useEffect } from 'react';

type Props = { error: Error & { digest?: string }; reset: () => void };

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container py-32 text-center">
      <p className="font-display text-5xl text-ink">Something went wrong</p>
      <p className="mt-4 text-ink-muted">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-12 items-center border border-ink px-8 text-sm uppercase tracking-widest hover:border-brass hover:text-brass"
      >
        Try again
      </button>
    </div>
  );
}
