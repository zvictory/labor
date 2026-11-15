'use client';

import Link from 'next/link';
import { useHydrated } from '@/lib/use-hydrated';
import { useRef, useState } from 'react';

export type FilterGroup = {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
  moreHref?: string;
  moreLabel?: string;
};

type Props = {
  action: string;
  groups: FilterGroup[];
  preserved: [string, string][];
  clearHref: string;
  copy: { filters: string; apply: string; cancel: string; clear: string; all: string };
};

export function CatalogFilters({ action, groups, preserved, clearHref, copy }: Props) {
  const ready = useHydrated();
  const [expanded, setExpanded] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const close = () => {
    form.current?.reset();
    setExpanded(false);
  };

  return (
    <div className="border-border mb-5 border-b pb-5 lg:mb-8">
      <button
        type="button"
        disabled={!ready}
        aria-expanded={expanded}
        aria-controls="catalog-filter-panel"
        onClick={() => (expanded ? close() : setExpanded(true))}
        className="border-border min-h-11 border px-4 text-sm font-medium lg:hidden"
      >
        {copy.filters} <span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      <div id="catalog-filter-panel" className={`${expanded ? 'block' : 'hidden'} lg:block`}>
        <form ref={form} action={action} method="get" className="space-y-4 pt-4 lg:pt-0">
          {preserved.map(([name, value], index) => (
            <input key={`${name}-${index}`} type="hidden" name={name} value={value} />
          ))}
          <div className="grid gap-3 lg:grid-cols-4">
            {groups.map(({ name, label, value, options, moreHref, moreLabel }) => (
              <details key={name} className="border-border border p-3">
                <summary className="min-h-6 cursor-pointer text-sm font-medium">{label}</summary>
                <fieldset className="mt-3 flex max-h-64 flex-col gap-1 overflow-y-auto">
                  <legend className="sr-only">{label}</legend>
                  {[{ value: '', label: copy.all }, ...options].map((option) => (
                    <label
                      key={option.value}
                      className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
                    >
                      <input
                        type="radio"
                        name={name}
                        value={option.value}
                        defaultChecked={option.value === (value ?? '')}
                      />
                      {option.label}
                    </label>
                  ))}
                  {moreHref && (
                    <Link href={moreHref} className="py-3 text-sm underline underline-offset-4">
                      {moreLabel} →
                    </Link>
                  )}
                </fieldset>
              </details>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <button
              type="submit"
              className="bg-foreground text-background min-h-11 px-5 font-medium"
            >
              {copy.apply}
            </button>
            <Link
              href={clearHref}
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {copy.clear}
            </Link>
            <button
              type="button"
              onClick={close}
              className="min-h-11 underline underline-offset-4 lg:hidden"
            >
              {copy.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
