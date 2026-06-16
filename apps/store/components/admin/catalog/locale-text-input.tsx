'use client';

// Per-locale text editor with ru/uz/en tabs. ru is the required primary locale;
// uz/en fall back to ru at read time, so they're optional here. Used by the
// product form and the taxonomy forms for any { ru, uz, en } JSON field.

import { useState } from 'react';

import type { LocaleText } from '@/lib/catalog/types';

const LOCALES = ['ru', 'uz', 'en'] as const;
type LocaleKey = (typeof LOCALES)[number];

const LOCALE_LABEL: Record<LocaleKey, string> = { ru: 'RU', uz: 'UZ', en: 'EN' };

interface Props {
  label: string;
  value: LocaleText;
  onChange: (next: LocaleText) => void;
  /** Render a textarea instead of a single-line input (for descriptions). */
  multiline?: boolean;
  /** ru is required by default; pass false for fully-optional fields. */
  ruRequired?: boolean;
  rows?: number;
}

export function LocaleTextInput({
  label,
  value,
  onChange,
  multiline = false,
  ruRequired = true,
  rows = 4,
}: Props) {
  const [active, setActive] = useState<LocaleKey>('ru');

  const set = (locale: LocaleKey, text: string) => {
    onChange({ ...value, [locale]: text });
  };

  const fieldCls =
    'w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink ' +
    'outline-none transition-colors focus:border-brass';

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
          {label}
          {ruRequired && <span className="ml-1 text-destructive">*</span>}
        </span>
        <div className="flex gap-1" role="tablist">
          {LOCALES.map((loc) => {
            const filled = (value[loc] ?? '').length > 0;
            return (
              <button
                key={loc}
                type="button"
                role="tab"
                aria-selected={active === loc}
                onClick={() => setActive(loc)}
                className={
                  'rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ' +
                  (active === loc
                    ? 'bg-ink text-bone'
                    : filled
                      ? 'bg-brass/15 text-brass'
                      : 'bg-secondary text-ink-muted hover:text-ink')
                }
              >
                {LOCALE_LABEL[loc]}
              </button>
            );
          })}
        </div>
      </div>

      {multiline ? (
        <textarea
          className={fieldCls}
          rows={rows}
          value={value[active] ?? ''}
          onChange={(e) => set(active, e.target.value)}
          required={active === 'ru' && ruRequired}
          aria-label={`${label} (${LOCALE_LABEL[active]})`}
        />
      ) : (
        <input
          className={fieldCls}
          value={value[active] ?? ''}
          onChange={(e) => set(active, e.target.value)}
          required={active === 'ru' && ruRequired}
          aria-label={`${label} (${LOCALE_LABEL[active]})`}
        />
      )}
    </div>
  );
}
