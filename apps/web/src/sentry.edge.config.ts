// Edge-runtime Sentry init. Imported by src/instrumentation.ts only when
// NEXT_RUNTIME === 'edge' (middleware, edge route handlers). Separate from the
// server config because the edge runtime has no Node APIs and Sentry ships a
// distinct edge build. Same DSN guard / graceful-degrade contract.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
