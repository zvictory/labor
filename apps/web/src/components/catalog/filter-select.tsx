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
      <span className="text-[10px] uppercase tracking-[0.25em] text-stone-400 font-bold">
        {label}
      </span>
      <div className="relative">
        <select
          value={currentValue}
          onChange={handleChange}
          disabled={isPending}
          className="w-full appearance-none border border-border/60 bg-bone/60 dark:bg-ink/60 px-3 py-2.5 pr-9 text-xs uppercase tracking-widest text-ink dark:text-bone focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass transition-colors disabled:opacity-60 cursor-pointer"
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
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
        >
          ▾
        </span>
      </div>
    </label>
  );
};
