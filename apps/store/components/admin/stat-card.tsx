import type { ReactNode } from 'react';
import Link from 'next/link';

// Small KPI card for the admin dashboard. A label, a big numeric value, and an
// optional hint line. When `href` is set the whole card is a link into the
// relevant section. Pure presentational server component (no client state).

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
}

export function StatCard({ label, value, hint, href }: StatCardProps) {
  const body = (
    <>
      <span className="text-micro text-brass font-bold tracking-[0.25em] uppercase">{label}</span>
      <span className="font-display text-ink dark:text-bone mt-2 text-4xl leading-none">
        {value}
      </span>
      {hint ? (
        <span className="text-ink-muted mt-2 text-xs dark:text-stone-400">{hint}</span>
      ) : null}
    </>
  );

  const className =
    'flex flex-col rounded-xl border border-border bg-background p-5 transition-colors';

  if (href) {
    return (
      <Link href={href} className={`${className} hover:border-foreground`}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
