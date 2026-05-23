'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '@/lib/api/client';

interface Props {
  productId: number;
  locale: string;
  initial?: {
    rating?: number;
    longevity?: number;
    sillage?: number;
    love_level?: 'love' | 'like' | 'dislike' | 'hate';
    seasons?: Array<'spring' | 'summer' | 'autumn' | 'winter'>;
    time_of_day?: Array<'day' | 'night'>;
  };
}

const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
const TIMES   = ['day', 'night'] as const;
const LOVES   = ['love', 'like', 'dislike', 'hate'] as const;

export const VoteWidget = ({ productId, locale, initial }: Props) => {
  const t = useTranslations('pdp.vote');
  const [rating, setRating]       = useState(initial?.rating ?? 0);
  const [longevity, setLongevity] = useState(initial?.longevity ?? 0);
  const [sillage, setSillage]     = useState(initial?.sillage ?? 0);
  const [love, setLove]           = useState<(typeof LOVES)[number] | null>(initial?.love_level ?? null);
  const [seasons, setSeasons]     = useState<Set<string>>(new Set(initial?.seasons ?? []));
  const [times, setTimes]         = useState<Set<string>>(new Set(initial?.time_of_day ?? []));
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (set: Set<string>, val: string): Set<string> => {
    const copy = new Set(set);
    if (copy.has(val)) copy.delete(val);
    else copy.add(val);
    return copy;
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('labor-token') ?? undefined : undefined;
        await apiFetch('/storefront/votes', {
          method: 'POST',
          locale,
          token,
          body: {
            product_id: productId,
            rating, longevity, sillage,
            love_level: love,
            seasons: [...seasons],
            time_of_day: [...times],
          },
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof ApiError && err.status === 401 ? t('signInRequired') : t('error'));
      }
    });
  };

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5" aria-labelledby="vote-heading">
      <h2 id="vote-heading" className="font-serif text-2xl tracking-tight">{t('title')}</h2>

      <StarRow label={t('rating')}    value={rating}    onChange={setRating} />
      <StarRow label={t('longevity')} value={longevity} onChange={setLongevity} />
      <StarRow label={t('sillage')}   value={sillage}   onChange={setSillage} />

      <Chips label={t('seasons')} options={SEASONS} selected={seasons} onToggle={(v) => setSeasons(toggle(seasons, v))} tk={(v) => t(`season.${v}`)} />
      <Chips label={t('timeTitle')}    options={TIMES}   selected={times}   onToggle={(v) => setTimes(toggle(times, v))}     tk={(v) => t(`time.${v}`)} />

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-stone-500">{t('loveTitle')}</p>
        <div className="flex flex-wrap gap-2">
          {LOVES.map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => setLove(l === love ? null : l)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                love === l ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'
              }`}
            >
              {t(`love.${l}`)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">{t('saved')}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending || rating === 0}
        className="w-full rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-40"
      >
        {pending ? t('saving') : t('submit')}
      </button>
    </section>
  );
};

const StarRow = ({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) => (
  <div>
    <p className="mb-1 text-xs font-medium uppercase tracking-widest text-stone-500">{label}</p>
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={`text-2xl transition ${n <= value ? 'text-amber-500' : 'text-stone-300 hover:text-amber-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  </div>
);

interface ChipsProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: Set<string>;
  onToggle: (val: T) => void;
  tk: (val: T) => string;
}

const Chips = <T extends string>({ label, options, selected, onToggle, tk }: ChipsProps<T>) => (
  <div>
    <p className="mb-2 text-xs font-medium uppercase tracking-widest text-stone-500">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((v) => (
        <button
          type="button"
          key={v}
          onClick={() => onToggle(v)}
          className={`rounded-full border px-3 py-1 text-sm transition ${
            selected.has(v) ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700'
          }`}
        >
          {tk(v)}
        </button>
      ))}
    </div>
  </div>
);
