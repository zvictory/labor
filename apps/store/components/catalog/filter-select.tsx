'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterSelectProps {
  label: string;
  paramName: 'brand' | 'note' | 'family' | 'gender' | 'sort';
  currentValue: string;
  allLabel: string;
  options: readonly FilterOption[];
  preserve: Record<string, string | undefined>;
  locale: string;
  showAll?: boolean;
}

export const FilterSelect = ({
  label,
  paramName,
  currentValue,
  allLabel,
  options,
  preserve,
  locale,
  showAll = true,
}: FilterSelectProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve)) {
      if (v) next.set(k, v);
    }
    const value = e.target.value;
    if (value === '') next.delete(paramName);
    else next.set(paramName, value);
    next.delete('page');
    const qs = next.toString();
    startTransition(() => {
      router.push(`/${locale}/catalog${qs ? `?${qs}` : ''}`);
    });
  };

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-micro text-muted-foreground font-bold tracking-[0.25em] uppercase">
        {label}
      </span>
      <div className="relative">
        <select
          value={currentValue}
          onChange={handleChange}
          disabled={isPending}
          className="border-border/60 bg-bone/60 text-ink focus:ring-brass dark:bg-ink/60 dark:text-bone w-full cursor-pointer appearance-none border px-3 py-2.5 pr-9 text-xs tracking-widest uppercase focus:ring-1 focus:outline-none disabled:opacity-60"
        >
          {showAll && <option value="">{allLabel}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.count !== undefined ? ` (${opt.count})` : ''}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
        >
          ▾
        </span>
      </div>
    </label>
  );
};
