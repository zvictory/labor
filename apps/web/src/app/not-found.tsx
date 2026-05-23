import Link from 'next/link';

// Next 15 applies the root layout to this segment, so it must NOT render its
// own <html>/<body>. The wrapper markup lives in app/layout.tsx.
export default function GlobalNotFound() {
  return (
    <div className="container py-32 text-center">
      <p className="font-display text-7xl">404</p>
      <p className="mt-4 text-muted-foreground">Page not found</p>
      <Link
        href="/ru"
        className="mt-8 inline-flex h-12 items-center border border-foreground px-8 text-sm uppercase tracking-widest"
      >
        Back home
      </Link>
    </div>
  );
}
