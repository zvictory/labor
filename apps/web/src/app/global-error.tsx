'use client';

// Top-level error boundary. Unlike [locale]/(site)/error.tsx (which catches
// errors *within* the site layout), global-error.tsx replaces the ROOT layout
// when the root itself throws — so it must render its own <html>/<body>. This
// is the last net before a hard white-screen; capturing here means even a
// layout-level crash reaches Sentry.
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

type Props = { error: Error & { digest?: string }; reset: () => void };

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: '8rem 1rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem' }}>Something went wrong</p>
          <button type="button" onClick={reset} style={{ marginTop: '2rem' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
