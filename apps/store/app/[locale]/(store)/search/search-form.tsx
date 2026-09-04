'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';

interface SearchFormProps {
  placeholder: string;
  initialValue?: string;
}

export function SearchForm({ placeholder, initialValue = '' }: SearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) {
      params.set('q', trimmed);
    } else {
      params.delete('q');
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setValue('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex w-full max-w-2xl items-center">
      <div className="relative w-full">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-full border border-stone-200 bg-stone-50/50 pl-12 pr-12 text-sm text-ink outline-none transition-all placeholder:text-stone-400 focus:border-brass/60 focus:bg-white dark:border-stone-850 dark:bg-stone-900/50 dark:text-bone dark:focus:border-brass/60 dark:focus:bg-stone-900"
          autoFocus
        />
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-stone-400" />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-3.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {isPending && (
        <span className="absolute right-14 text-xs text-stone-400 animate-pulse">
          ...
        </span>
      )}
    </form>
  );
}
