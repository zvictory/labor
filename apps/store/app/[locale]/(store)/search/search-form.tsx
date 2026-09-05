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
          className="border-border text-ink focus:border-brass/60 dark:text-bone dark:focus:border-brass/60 h-12 w-full border pr-12 pl-12 text-sm transition-all outline-none placeholder:text-stone-400 dark:focus:bg-stone-900"
          autoFocus
        />
        <Search className="text-muted-foreground absolute top-3.5 left-4 h-5 w-5" />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground absolute top-3.5 right-4"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {isPending && (
        <span className="text-muted-foreground absolute right-14 animate-pulse text-xs">...</span>
      )}
    </form>
  );
}
