'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface MobileFilterDrawerProps {
  locale: string;
  facets: {
    brands: readonly { slug: string; name: string; count: number }[];
    notes: readonly { slug: string; name: string; count: number }[];
    families: readonly { slug: string; count: number }[];
    genders: readonly { slug: string; count: number }[];
  };
  currentFilters: {
    brand?: string;
    note?: string;
    family?: string;
    gender?: string;
    sort: string;
  };
  preserve: Record<string, string | undefined>;
  totalCount: number;
  copy: {
    brands: string;
    notes: string;
    families: string;
    genders: string;
    sort: string;
    clearAll: string;
    apply: string;
    close: string;
    all: string;
    foundCount: string;
    searchPlaceholder: string;
    sortBy: string;
    popular: string;
    newest: string;
    priceAsc: string;
    priceDesc: string;
  };
  familyLabels: Record<string, string>;
  genderLabels: Record<string, string>;
}

export function MobileFilterDrawer({
  locale,
  facets,
  currentFilters,
  preserve,
  totalCount,
  copy,
  familyLabels,
  genderLabels,
}: MobileFilterDrawerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Drawers open state
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Accordion sections state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sort: false,
    brand: false,
    note: false,
    family: true,
    gender: true,
  });

  // Client-side search filters for large lists
  const [brandQuery, setBrandQuery] = useState('');
  const [noteQuery, setNoteQuery] = useState('');

  // Count active filters (excluding sort)
  const activeFiltersCount = [
    currentFilters.brand,
    currentFilters.note,
    currentFilters.family,
    currentFilters.gender,
  ].filter(Boolean).length;

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFilterChange = (paramName: string, value: string) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve)) {
      if (v) next.set(k, v);
    }

    const currentVal = preserve[paramName];
    if (currentVal === value || value === '') {
      next.delete(paramName);
    } else {
      next.set(paramName, value);
    }
    next.delete('page');

    const qs = next.toString();
    startTransition(() => {
      router.push(`/${locale}/catalog${qs ? `?${qs}` : ''}`);
    });
  };

  const handleSortChange = (value: string) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve)) {
      if (v) next.set(k, v);
    }
    next.set('sort', value);
    next.delete('page');

    const qs = next.toString();
    setIsSortOpen(false);
    startTransition(() => {
      router.push(`/${locale}/catalog${qs ? `?${qs}` : ''}`);
    });
  };

  const handleClearAll = () => {
    const clearUrl = `/${locale}/catalog${currentFilters.sort !== 'new' ? `?sort=${currentFilters.sort}` : ''}`;
    setIsFilterOpen(false);
    startTransition(() => {
      router.push(clearUrl);
    });
  };

  // Prevent background scroll when full-screen filter drawer is open
  useEffect(() => {
    if (isFilterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFilterOpen]);

  // Subscribe to header filter trigger event
  useEffect(() => {
    const handleOpenFilter = () => {
      setIsFilterOpen(true);
    };
    window.addEventListener('open-catalog-filter', handleOpenFilter);
    return () => {
      window.removeEventListener('open-catalog-filter', handleOpenFilter);
    };
  }, []);

  const sortOptions = [
    { value: 'popular', label: copy.popular },
    { value: 'new', label: copy.newest },
    { value: 'price_asc', label: copy.priceAsc },
    { value: 'price_desc', label: copy.priceDesc },
  ];

  const currentSortLabel =
    sortOptions.find((o) => o.value === currentFilters.sort)?.label || copy.newest;

  // Filtered lists for Brand and Note search inputs
  const filteredBrands = facets.brands.filter((b) =>
    b.name.toLowerCase().includes(brandQuery.toLowerCase()),
  );
  const filteredNotes = facets.notes.filter((n) =>
    n.name.toLowerCase().includes(noteQuery.toLowerCase()),
  );

  return (
    <>
      {/* Mobile Sticky Utility Bar */}
      <div className="border-border bg-background sticky top-16 z-30 flex hidden items-center justify-between border-b px-4 py-3">
        <span className="text-muted-foreground font-mono text-xs font-semibold tracking-wider uppercase">
          {copy.foundCount.replace('{count}', String(totalCount))}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Sort Button */}
          <button
            onClick={() => setIsSortOpen(true)}
            className="border-border text-muted-foreground flex h-9 items-center gap-1.5 border px-3.5 text-xs font-semibold tracking-wider uppercase"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>{currentSortLabel}</span>
          </button>

          {/* Filter Button */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className="border-border text-muted-foreground relative flex h-9 items-center gap-1.5 border px-3.5 text-xs font-semibold tracking-wider uppercase"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{copy.sortBy}</span>
            {activeFiltersCount > 0 && (
              <span className="bg-foreground text-micro text-bone flex h-4 min-w-4 items-center justify-center px-1 leading-none font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sort Bottom Sheet */}
      {isSortOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsSortOpen(false)}
            className="bg-graphite/50 absolute inset-0 transition-opacity duration-300"
          />
          {/* Content Sheet */}
          <div className="bg-background border-border relative z-10 w-full max-w-lg border-t p-6 duration-300">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg">{copy.sort}</h3>
              <button
                onClick={() => setIsSortOpen(false)}
                className="hover:text-muted-foreground p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1">
              {sortOptions.map((opt) => {
                const isSelected = currentFilters.sort === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSortChange(opt.value)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-xs font-semibold tracking-widest uppercase transition-colors ${
                      isSelected
                        ? 'bg-brass/10 text-foreground dark:bg-brass/20'
                        : 'text-muted-foreground hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter Full-Screen Drawer */}
      {isFilterOpen && (
        <div className="bg-background fixed inset-0 z-50 flex flex-col duration-300 md:hidden">
          {/* Header */}
          <header className="border-border bg-background flex h-16 shrink-0 items-center justify-between border-b px-4 dark:border-stone-900">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFilterOpen(false)}
                className="text-muted-foreground dark:hover:text-bone -ml-2 p-2 hover:text-stone-950"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="font-display text-xl">{copy.sortBy}</h2>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-foreground text-xs font-bold tracking-wider uppercase hover:underline"
              >
                {copy.clearAll}
              </button>
            )}
          </header>

          {/* Accordion List Body */}
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {/* SORT ACCORDION */}
            <div className="border-border border-b pb-4 dark:border-stone-900">
              <button
                onClick={() => toggleSection('sort')}
                className="flex w-full items-center justify-between py-2 text-xs font-bold tracking-widest text-stone-800 uppercase"
              >
                <span>{copy.sort}</span>
                {openSections.sort ? (
                  <ChevronUp className="text-muted-foreground h-4 w-4" />
                ) : (
                  <ChevronDown className="text-muted-foreground h-4 w-4" />
                )}
              </button>
              {openSections.sort && (
                <div className="mt-3 space-y-1 duration-200">
                  {sortOptions.map((opt) => {
                    const isSelected = currentFilters.sort === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleSortChange(opt.value)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-xs font-semibold tracking-widest uppercase transition-colors ${
                          isSelected
                            ? 'bg-brass/10 text-foreground dark:bg-brass/20 font-bold'
                            : 'text-muted-foreground hover:bg-stone-50 dark:hover:bg-stone-800'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* GENDER ACCORDION */}
            <div className="border-border border-b pb-4 dark:border-stone-900">
              <button
                onClick={() => toggleSection('gender')}
                className="flex w-full items-center justify-between py-2 text-xs font-bold tracking-widest text-stone-800 uppercase"
              >
                <span>{copy.genders}</span>
                {openSections.gender ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {openSections.gender && (
                <div className="mt-3 flex flex-wrap gap-2 duration-200">
                  {facets.genders.map((g) => {
                    const isSelected = currentFilters.gender === g.slug;
                    return (
                      <button
                        key={g.slug}
                        onClick={() => handleFilterChange('gender', g.slug)}
                        className={`text-micro flex h-8 items-center gap-1.5 border px-3 font-bold tracking-wider uppercase transition-colors ${
                          isSelected
                            ? 'border-brass bg-foreground text-bone'
                            : 'border-border text-muted-foreground dark:bg-stone-900/35'
                        }`}
                      >
                        <span>{genderLabels[g.slug] || g.slug}</span>
                        <span className="opacity-60">({g.count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FAMILIES ACCORDION */}
            <div className="border-border border-b pb-4 dark:border-stone-900">
              <button
                onClick={() => toggleSection('family')}
                className="flex w-full items-center justify-between py-2 text-xs font-bold tracking-widest text-stone-800 uppercase"
              >
                <span>{copy.families}</span>
                {openSections.family ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {openSections.family && (
                <div className="mt-3 flex flex-wrap gap-2 duration-200">
                  {facets.families.map((f) => {
                    const isSelected = currentFilters.family === f.slug;
                    return (
                      <button
                        key={f.slug}
                        onClick={() => handleFilterChange('family', f.slug)}
                        className={`text-micro flex h-8 items-center gap-1.5 border px-3 font-bold tracking-wider uppercase transition-colors ${
                          isSelected
                            ? 'border-brass bg-foreground text-bone'
                            : 'border-border text-muted-foreground dark:bg-stone-900/35'
                        }`}
                      >
                        <span>{familyLabels[f.slug] || f.slug}</span>
                        <span className="opacity-60">({f.count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BRANDS ACCORDION */}
            <div className="border-border border-b pb-4 dark:border-stone-900">
              <button
                onClick={() => toggleSection('brand')}
                className="flex w-full items-center justify-between py-2 text-xs font-bold tracking-widest text-stone-800 uppercase"
              >
                <span>{copy.brands}</span>
                {openSections.brand ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {openSections.brand && (
                <div className="mt-3 space-y-3 duration-200">
                  {/* Brand search bar */}
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={copy.searchPlaceholder}
                      value={brandQuery}
                      onChange={(e) => setBrandQuery(e.target.value)}
                      className="border-border h-9 w-full border pr-4 pl-9 text-xs font-medium focus:outline-none"
                    />
                    {brandQuery && (
                      <button
                        onClick={() => setBrandQuery('')}
                        className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 p-0.5 hover:text-stone-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {/* Brand select items */}
                  <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
                    {filteredBrands.map((b) => {
                      const isSelected = currentFilters.brand === b.slug;
                      return (
                        <button
                          key={b.slug}
                          onClick={() => handleFilterChange('brand', b.slug)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-brass/10 text-foreground font-bold'
                              : 'text-muted-foreground hover:bg-stone-50 dark:hover:bg-stone-900/40'
                          }`}
                        >
                          <span className="truncate">{b.name}</span>
                          <span className="text-micro font-mono opacity-60">({b.count})</span>
                        </button>
                      );
                    })}
                    {filteredBrands.length === 0 && (
                      <p className="text-muted-foreground py-4 text-center text-xs font-medium">
                        No matches found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* NOTES ACCORDION */}
            <div className="border-border border-b pb-4 dark:border-stone-900">
              <button
                onClick={() => toggleSection('note')}
                className="flex w-full items-center justify-between py-2 text-xs font-bold tracking-widest text-stone-800 uppercase"
              >
                <span>{copy.notes}</span>
                {openSections.note ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {openSections.note && (
                <div className="mt-3 space-y-3 duration-200">
                  {/* Note search bar */}
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={copy.searchPlaceholder}
                      value={noteQuery}
                      onChange={(e) => setNoteQuery(e.target.value)}
                      className="border-border h-9 w-full border pr-4 pl-9 text-xs font-medium focus:outline-none"
                    />
                    {noteQuery && (
                      <button
                        onClick={() => setNoteQuery('')}
                        className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 p-0.5 hover:text-stone-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {/* Note select items */}
                  <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
                    {filteredNotes.map((n) => {
                      const isSelected = currentFilters.note === n.slug;
                      return (
                        <button
                          key={n.slug}
                          onClick={() => handleFilterChange('note', n.slug)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-brass/10 text-foreground font-bold'
                              : 'text-muted-foreground hover:bg-stone-50 dark:hover:bg-stone-900/40'
                          }`}
                        >
                          <span className="truncate">{n.name}</span>
                          <span className="text-micro font-mono opacity-60">({n.count})</span>
                        </button>
                      );
                    })}
                    {filteredNotes.length === 0 && (
                      <p className="text-muted-foreground py-4 text-center text-xs font-medium">
                        No matches found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Footer */}
          <footer className="border-border bg-background flex shrink-0 flex-col gap-2 border-t p-4 pb-[calc(16px+env(safe-area-inset-bottom))] dark:border-stone-900">
            <button
              onClick={() => setIsFilterOpen(false)}
              disabled={isPending}
              className="bg-ink dark:bg-bone dark:text-ink text-bone flex h-12 w-full items-center justify-center text-xs font-semibold tracking-widest uppercase transition-colors hover:opacity-80 disabled:opacity-60"
            >
              {isPending ? (
                <span className="border-bone flex h-4 w-4 animate-spin border-2 border-t-transparent" />
              ) : (
                `${copy.apply} (${totalCount})`
              )}
            </button>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="text-muted-foreground flex h-10 w-full items-center justify-center text-xs font-semibold tracking-widest uppercase hover:text-stone-700"
            >
              {copy.close}
            </button>
          </footer>
        </div>
      )}
    </>
  );
}
