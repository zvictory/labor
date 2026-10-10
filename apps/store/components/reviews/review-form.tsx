'use client';

import { useActionState, useId, useState } from 'react';
import { useTranslations } from 'next-intl';

import { submitReviewAction, type ReviewFormState } from '@/lib/reviews/actions';
import { RATING_MAX } from '@/lib/reviews/reviews';

const ERROR_KEY = {
  sign_in: 'errorBuyer',
  rating: 'errorRating',
  not_a_buyer: 'errorBuyer',
  unexpected: 'errorGeneric',
} as const;

// Stars as a radio group: keyboard and screen reader get five labelled
// choices, the eye gets a row of stars that fills up to the one chosen (or
// hovered).
export function ReviewForm({
  productId,
  slug,
  locale,
  initial,
}: {
  productId: number;
  slug: string;
  locale: string;
  initial: { rating: number | null; comment: string | null; pending: boolean } | null;
}) {
  const t = useTranslations('reviews');
  const id = useId();
  const [state, action, pending] = useActionState<ReviewFormState, FormData>(
    submitReviewAction,
    null,
  );
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);

  if (state?.ok) {
    return (
      <p role="status" className="border-border border p-5 text-sm">
        {t('saved')}
      </p>
    );
  }

  return (
    <form action={action} className="border-border space-y-4 border p-5">
      <h3 className="text-label font-mono tracking-[0.16em] uppercase">{t('formTitle')}</h3>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locale" value={locale} />

      <fieldset>
        <legend className="sr-only">{t('rating')}</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name="rating"
                value={n}
                required
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`peer-focus-visible:outline-foreground block px-0.5 text-2xl leading-none peer-focus-visible:outline peer-focus-visible:outline-2 ${
                  n <= (hover || rating) ? 'text-foreground' : 'text-ink-muted/40'
                }`}
              >
                ★
              </span>
              <span className="sr-only">{t('stars', { n })}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor={`${id}-comment`}
          className="text-ink-muted mb-1.5 block text-xs tracking-widest uppercase dark:text-stone-400"
        >
          {t('comment')}
        </label>
        <textarea
          id={`${id}-comment`}
          name="comment"
          rows={3}
          maxLength={1500}
          defaultValue={initial?.comment ?? ''}
          placeholder={t('commentPlaceholder')}
          className="border-border text-ink focus:border-foreground dark:bg-ink/40 dark:text-bone w-full rounded-md border bg-white px-3 py-2 text-sm"
        />
        {initial?.pending && <p className="text-muted-foreground mt-1 text-xs">{t('pending')}</p>}
      </div>

      {state?.ok === false && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {t(ERROR_KEY[state.error])}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-11 items-center justify-center px-6 text-xs font-semibold tracking-widest uppercase transition-colors disabled:opacity-50"
      >
        {t('submit')}
      </button>
    </form>
  );
}
