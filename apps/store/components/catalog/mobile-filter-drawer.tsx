'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, ArrowUpDown, X, Search, ChevronDown, ChevronUp, Check } from 'lucide-react';

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

  const currentSortLabel = sortOptions.find(o => o.value === currentFilters.sort)?.label || copy.newest;

  // Filtered lists for Brand and Note search inputs
  const filteredBrands = facets.brands.filter(b => 
    b.name.toLowerCase().includes(brandQuery.toLowerCase())
  );
  const filteredNotes = facets.notes.filter(n => 
    n.name.toLowerCase().includes(noteQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Sticky Utility Bar */}
      <div className="sticky top-16 z-30 flex items-center justify-between border-b border-stone-200/80 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-950/95 hidden">
        <span className="font-mono text-xs font-semibold text-stone-500 uppercase tracking-wider">
          {copy.foundCount.replace('{count}', String(totalCount))}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Sort Button */}
          <button
            onClick={() => setIsSortOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full border border-stone-200/80 bg-stone-50/50 px-3.5 text-xs font-semibold uppercase tracking-wider text-stone-700 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300 active:bg-stone-100 dark:active:bg-stone-800"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>{currentSortLabel}</span>
          </button>

          {/* Filter Button */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className="relative flex h-9 items-center gap-1.5 rounded-full border border-stone-200/80 bg-stone-50/50 px-3.5 text-xs font-semibold uppercase tracking-wider text-stone-700 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300 active:bg-stone-100 dark:active:bg-stone-800"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{copy.sortBy}</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brass px-1 text-[9px] font-bold text-bone leading-none">
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
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
          />
          {/* Content Sheet */}
          <div className="relative z-10 w-full rounded-t-2xl bg-white p-6 shadow-xl dark:bg-stone-900 max-w-lg border-t border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom duration-300">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-stone-900 dark:text-stone-100">
                {copy.sort}
              </h3>
              <button onClick={() => setIsSortOpen(false)} className="p-1 hover:text-brass">
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
                    className={`flex w-full items-center justify-between rounded-lg py-3 px-4 text-xs font-semibold uppercase tracking-widest transition-colors ${
                      isSelected
                        ? 'bg-brass/10 text-brass dark:bg-brass/20'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
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
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-stone-950 md:hidden animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b border-stone-100 bg-white px-4 dark:border-stone-900 dark:bg-stone-950 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-2 -ml-2 text-stone-500 hover:text-stone-950 dark:hover:text-bone"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="font-display text-xl text-stone-900 dark:text-stone-100">
                {copy.sortBy}
              </h2>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs font-bold uppercase tracking-wider text-brass hover:underline"
              >
                {copy.clearAll}
              </button>
            )}
          </header>

          {/* Accordion List Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* SORT ACCORDION */}
            <div className="border-b border-stone-100 pb-4 dark:border-stone-900">
              <button
                onClick={() => toggleSection('sort')}
                className="flex w-full items-center justify-between py-2 text-xs font-bold uppercase tracking-widest text-stone-800 dark:text-stone-200"
              >
                <span>{copy.sort}</span>
                {openSections.sort ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
              </button>
              {openSections.sort && (
                <div className="mt-3 space-y-1 animate-in fade-in duration-200">
                  {sortOptions.map((opt) => {
                    const isSelected = currentFilters.sort === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleSortChange(opt.value)}
                        className={`flex w-full items-center justify-between rounded-lg py-2 px-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
                          isSelected
                            ? 'bg-brass/10 text-brass dark:bg-brass/20 font-bold'
                            : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
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
            <div className="border-b border-stone-100 pb-4 dark:border-stone-900">
              <button
                onClick={() => toggleSection('gender')}
                className="flex w-full items-center justify-between py-2 text-xs font-bold uppercase tracking-widest text-stone-800 dark:text-stone-200"
              >
                <span>{copy.genders}</span>
                {openSections.gender ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {openSections.gender && (
                <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in duration-200">
                  {facets.genders.map((g) => {
                    const isSelected = currentFilters.gender === g.slug;
                    return (
                      <button
                        key={g.slug}
                        onClick={() => handleFilterChange('gender', g.slug)}
                        className={`flex h-8 items-center gap-1.5 border px-3 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          isSelected
                            ? 'border-brass bg-brass text-bone'
                            : 'border-stone-200 text-stone-600 bg-stone-50/50 dark:border-stone-800 dark:text-stone-400 dark:bg-stone-900/35'
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
            <div className="border-b border-stone-100 pb-4 dark:border-stone-900">
              <button
                onClick={() => toggleSection('family')}
                className="flex w-full items-center justify-between py-2 text-xs font-bold uppercase tracking-widest text-stone-800 dark:text-stone-200"
              >
                <span>{copy.families}</span>
                {openSections.family ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {openSections.family && (
                <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in duration-200">
                  {facets.families.map((f) => {
                    const isSelected = currentFilters.family === f.slug;
                    return (
                      <button
                        key={f.slug}
                        onClick={() => handleFilterChange('family', f.slug)}
                        className={`flex h-8 items-center gap-1.5 border px-3 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          isSelected
                            ? 'border-brass bg-brass text-bone'
                            : 'border-stone-200 text-stone-600 bg-stone-50/50 dark:border-stone-800 dark:text-stone-400 dark:bg-stone-900/35'
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
            <div className="border-b border-stone-100 pb-4 dark:border-stone-900">
              <button
                onClick={() => toggleSection('brand')}
                className="flex w-full items-center justify-between py-2 text-xs font-bold uppercase tracking-widest text-stone-800 dark:text-stone-200"
              >
                <span>{copy.brands}</span>
                {openSections.brand ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {openSections.brand && (
                <div className="mt-3 space-y-3 animate-in fade-in duration-200">
                  {/* Brand search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder={copy.searchPlaceholder}
                      value={brandQuery}
                      onChange={(e) => setBrandQuery(e.target.value)}
                      className="h-9 w-full rounded-md border border-stone-200 bg-stone-50/50 pl-9 pr-4 text-xs font-medium focus:border-brass focus:bg-white focus:outline-none dark:border-stone-800 dark:bg-stone-900/50"
                    />
                    {brandQuery && (
                      <button
                        onClick={() => setBrandQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {/* Brand select items */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                    {filteredBrands.map((b) => {
                      const isSelected = currentFilters.brand === b.slug;
                      return (
                        <button
                          key={b.slug}
                          onClick={() => handleFilterChange('brand', b.slug)}
                          className={`flex w-full items-center justify-between rounded-md py-2 px-3 text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-brass/10 text-brass font-bold'
                              : 'hover:bg-stone-50 dark:hover:bg-stone-900/40 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          <span className="truncate">{b.name}</span>
                          <span className="font-mono text-[10px] opacity-60">({b.count})</span>
                        </button>
                      );
                    })}
                    {filteredBrands.length === 0 && (
                      <p className="py-4 text-center text-xs text-stone-400 font-medium">
                        No matches found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* NOTES ACCORDION */}
            <div className="border-b border-stone-100 pb-4 dark:border-stone-900">
              <button
                onClick={() => toggleSection('note')}
                className="flex w-full items-center justify-between py-2 text-xs font-bold uppercase tracking-widest text-stone-800 dark:text-stone-200"
              >
                <span>{copy.notes}</span>
                {openSections.note ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {openSections.note && (
                <div className="mt-3 space-y-3 animate-in fade-in duration-200">
                  {/* Note search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder={copy.searchPlaceholder}
                      value={noteQuery}
                      onChange={(e) => setNoteQuery(e.target.value)}
                      className="h-9 w-full rounded-md border border-stone-200 bg-stone-50/50 pl-9 pr-4 text-xs font-medium focus:border-brass focus:bg-white focus:outline-none dark:border-stone-800 dark:bg-stone-900/50"
                    />
                    {noteQuery && (
                      <button
                        onClick={() => setNoteQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {/* Note select items */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                    {filteredNotes.map((n) => {
                      const isSelected = currentFilters.note === n.slug;
                      return (
                        <button
                          key={n.slug}
                          onClick={() => handleFilterChange('note', n.slug)}
                          className={`flex w-full items-center justify-between rounded-md py-2 px-3 text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-brass/10 text-brass font-bold'
                              : 'hover:bg-stone-50 dark:hover:bg-stone-900/40 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          <span className="truncate">{n.name}</span>
                          <span className="font-mono text-[10px] opacity-60">({n.count})</span>
                        </button>
                      );
                    })}
                    {filteredNotes.length === 0 && (
                      <p className="py-4 text-center text-xs text-stone-400 font-medium">
                        No matches found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Footer */}
          <footer className="border-t border-stone-100 bg-white p-4 dark:border-stone-900 dark:bg-stone-950 flex flex-col gap-2 shrink-0 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <button
              onClick={() => setIsFilterOpen(false)}
              disabled={isPending}
              className="flex h-12 w-full items-center justify-center bg-ink dark:bg-bone dark:text-ink text-bone font-semibold text-xs uppercase tracking-widest transition-colors hover:bg-brass disabled:opacity-60"
            >
              {isPending ? (
                <span className="flex h-4 w-4 animate-spin rounded-full border-2 border-bone border-t-transparent" />
              ) : (
                `${copy.apply} (${totalCount})`
              )}
            </button>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="flex h-10 w-full items-center justify-center text-xs font-semibold text-stone-500 hover:text-stone-700 uppercase tracking-widest"
            >
              {copy.close}
            </button>
          </footer>
        </div>
      )}
    </>
  );
}
