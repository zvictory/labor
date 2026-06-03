// Browser-runtime Sentry init. In @sentry/nextjs v10 this file replaces the
// deprecated sentry.client.config.ts (the plan named the old path; the installed
// SDK convention wins — Rule 7). Next auto-loads it in the client bundle.
//
// Guarded on NEXT_PUBLIC_SENTRY_DSN: this DSN is browser-shipped and public by
// design (any client pixel/DSN is). Blank → no init, Sentry no-ops.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

// Required by the App Router for navigation-transition tracing. Harmless when
// Sentry was not initialized (no DSN) — it simply has nothing to record.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
