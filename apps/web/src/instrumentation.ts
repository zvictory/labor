// Next 15 instrumentation hook. register() runs once per server process at
// startup and dynamically loads the runtime-appropriate Sentry config — the
// Node and edge runtimes can't share one init (edge has no Node APIs).
//
// onRequestError forwards errors thrown in Server Components, route handlers,
// and other server code to Sentry — these never reach a client error boundary,
// so without this hook an SSR/RSC throw during an IG campaign would be invisible
// (the brief's "silent checkout 500 = money on fire").
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
