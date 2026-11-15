'use client';

import { useId, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useHydrated } from '@/lib/use-hydrated';
import type { Locale } from '@/i18n/config';
import { filterDirectory } from './directory-filter';

export type DirectoryGroup = {
  id: string;
  label: string;
  items: { id: string; name: string; searchTerms?: string[]; content: ReactNode }[];
};

const COPY = {
  ru: {
    search: 'Поиск по названию',
    clear: 'Очистить',
    results: 'Найдено',
    empty: 'Ничего не найдено. Попробуйте другое название.',
    groups: 'Семейства нот',
  },
  en: {
    search: 'Search by name',
    clear: 'Clear',
    results: 'Results',
    empty: 'No matches. Try another name.',
    groups: 'Note families',
  },
  uz: {
    search: 'Nom bo‘yicha qidirish',
    clear: 'Tozalash',
    results: 'Natijalar',
    empty: 'Hech narsa topilmadi. Boshqa nomni sinab ko‘ring.',
    groups: 'Notalar oilalari',
  },
};

export function DirectorySearch({
  groups,
  locale,
  jumpLinks = false,
  variant = 'default',
}: {
  groups: DirectoryGroup[];
  locale: Locale;
  jumpLinks?: boolean;
  variant?: 'default' | 'minimal' | 'minimal-notes';
}) {
  const minimal = variant !== 'default';
  const noteLibrary = variant === 'minimal-notes';
  const ready = useHydrated();
  const [query, setQuery] = useState('');
  const id = useId();
  const c = COPY[locale];
  const visible = filterDirectory(groups, query, locale);
  const count = visible.reduce((sum, group) => sum + group.items.length, 0);
  return (
    <div className={minimal ? 'space-y-8 md:space-y-12' : 'space-y-10'}>
      <div
        className={
          minimal
            ? 'border-border grid gap-4 border-b pb-5 sm:grid-cols-[minmax(0,24rem)_auto] sm:items-center sm:justify-between'
            : 'border-border grid gap-3 border-y py-5 sm:grid-cols-[minmax(0,28rem)_auto] sm:items-end sm:justify-between'
        }
      >
        <div className="space-y-2">
          <label htmlFor={id} className={minimal ? 'sr-only' : 'eyebrow'}>
            {c.search}
          </label>
          <div className="relative">
            {noteLibrary && (
              <Search
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2"
              />
            )}
            <input
              id={id}
              type="search"
              disabled={!ready}
              placeholder={minimal ? c.search : undefined}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={
                noteLibrary
                  ? 'border-foreground/55 bg-muted/30 placeholder:text-muted-foreground focus-visible:outline-foreground h-12 w-full border pr-24 pl-12 text-base focus-visible:outline-2 focus-visible:outline-offset-2'
                  : minimal
                    ? 'placeholder:text-muted-foreground h-12 w-full bg-transparent pr-24 text-base focus-visible:outline-2 focus-visible:outline-offset-4'
                    : 'border-border bg-background h-12 w-full border px-4 pr-24 text-base focus-visible:outline-2 focus-visible:outline-offset-2'
              }
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-0 px-3 text-sm underline underline-offset-4"
              >
                {c.clear}
              </button>
            )}
          </div>
        </div>
        <p role="status" aria-live="polite" className="text-muted-foreground text-sm tabular-nums">
          {c.results}: {count}
        </p>
      </div>
      {jumpLinks && visible.length > 0 && (
        <nav
          aria-label={c.groups}
          className={
            noteLibrary
              ? 'flex [scrollbar-width:none] gap-x-5 gap-y-2 overflow-x-auto pb-2 text-sm [&::-webkit-scrollbar]:hidden'
              : 'flex flex-wrap gap-2'
          }
        >
          {visible.map((group) => (
            <a
              key={group.id}
              href={`#directory-${group.id}`}
              className={
                noteLibrary
                  ? 'inline-flex min-h-11 shrink-0 items-center gap-2 underline-offset-4 hover:underline'
                  : 'border-border hover:border-foreground inline-flex min-h-11 items-center gap-2 border px-3 text-sm'
              }
            >
              {group.label}
              <span className="text-muted-foreground tabular-nums">{group.items.length}</span>
            </a>
          ))}
        </nav>
      )}
      {count === 0 && <p className="body-copy py-12 text-center">{c.empty}</p>}
      {visible.map((group) => (
        <section id={`directory-${group.id}`} key={group.id} className="scroll-mt-28 space-y-5">
          <div
            className={
              minimal && !noteLibrary
                ? 'sr-only'
                : 'border-border flex items-baseline justify-between gap-4 border-b pb-3'
            }
          >
            <h2 className={noteLibrary ? 'text-lg font-medium' : 'eyebrow'}>{group.label}</h2>
            <span className="text-muted-foreground text-sm tabular-nums">{group.items.length}</span>
          </div>
          <div
            className={
              minimal
                ? 'grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:gap-x-12 md:gap-y-12 lg:grid-cols-4'
                : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6'
            }
          >
            {group.items.map((item) => (
              <div key={item.id} className="min-w-0">
                {item.content}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
