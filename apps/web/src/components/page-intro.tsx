import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageIntroProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
}

export const PageIntro = ({
  eyebrow,
  title,
  lead,
  action,
  align = 'center',
  className,
}: PageIntroProps) => (
  <header
    className={cn(
      'mx-auto w-full max-w-3xl py-3 md:py-4',
      align === 'center' ? 'text-center' : 'text-left',
      className,
    )}
  >
    {eyebrow ? (
      <div className="text-brass text-[10px] font-bold tracking-[0.32em] uppercase md:text-xs">
        {eyebrow}
      </div>
    ) : null}
    <h1 className="text-ink dark:text-bone mt-2 font-sans text-3xl font-bold tracking-tight md:text-4xl">
      {title}
    </h1>
    <div
      className={cn(
        'bg-brass my-3 h-px w-10 opacity-60',
        align === 'center' ? 'mx-auto' : 'mr-auto',
      )}
    />
    {lead ? (
      <p className="text-ink-muted mx-auto max-w-2xl text-sm leading-5 dark:text-stone-400">
        {lead}
      </p>
    ) : null}
    {action ? <div className="mt-3">{action}</div> : null}
  </header>
);
