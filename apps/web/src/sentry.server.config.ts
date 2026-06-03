// Server-runtime Sentry init (Node). Imported by src/instrumentation.ts only
// when NEXT_RUNTIME === 'nodejs'. Guarded on the DSN: if SENTRY_DSN is blank,
// init never runs and Sentry is a silent no-op. This is the deliberate
// graceful-degrade contract — a missing observability DSN means "monitoring
// off," never "app won't boot" (cf. apps/backend .../00_required_env.rb, which
// fail-fasts only on security-critical secrets, NOT on the Sentry DSN).
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Low trace sampling: this is a small store pre-launch — we want error
    // capture, not a performance-tracing bill. Raise once there's real traffic.
    tracesSampleRate: 0.1,
    // No PII to Sentry by default. Checkout carries names/phones; keep them out
    // of the error pipeline unless explicitly needed for a debug session.
    sendDefaultPii: false,
  });
}
