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
      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-brass">
        {label}
      </span>
      <span className="mt-2 font-display text-4xl leading-none text-ink dark:text-bone">
        {value}
      </span>
      {hint ? (
        <span className="mt-2 text-xs text-ink-muted dark:text-stone-400">{hint}</span>
      ) : null}
    </>
  );

  const className =
    'flex flex-col rounded-xl border border-border bg-background p-5 transition-colors';

  if (href) {
    return (
      <Link href={href} className={`${className} hover:border-brass`}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
