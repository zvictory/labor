'use client';

// A sum in so'm. Typed as digits, shown grouped ("85 000") with the currency
// beside it, and handed to the form as a whole number: UZS has no minor unit.
// Empty is null, for sums that may be left out.

import { useState } from 'react';

const MAX_DIGITS = 9;

const group = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function MoneyInput({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value === null ? '' : group(String(value)));

  return (
    <div className="relative">
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className={`${className ?? ''} pr-14 font-mono tabular-nums`}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS);
          setText(group(digits));
          onChange(digits ? Number(digits) : null);
        }}
      />
      <span className="text-ink-muted pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs dark:text-stone-400">
        soʻm
      </span>
    </div>
  );
}
