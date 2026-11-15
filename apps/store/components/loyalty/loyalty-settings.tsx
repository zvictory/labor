'use client';

// The two things a member sets on their card: the date of birth (once) and the
// consent to promotional messages.

import { useState, useTransition } from 'react';

import { setBirthDate, setMarketingConsent } from '@/lib/loyalty/account-actions';

export interface LoyaltySettingsCopy {
  birthday: string;
  birthdayHint: string;
  birthdaySave: string;
  consent: string;
  saved: string;
  errors: Record<string, string>;
}

export function LoyaltySettings({
  copy,
  birthDate,
  birthDateLabel,
  consent,
}: {
  copy: LoyaltySettingsCopy;
  /** yyyy-mm-dd, or null when not set yet. */
  birthDate: string | null;
  birthDateLabel: string | null;
  consent: boolean;
}) {
  const [date, setDate] = useState('');
  const [agreed, setAgreed] = useState(consent);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const fieldCls =
    'h-11 rounded-md border border-border bg-white px-3 text-sm text-ink dark:bg-ink/40 dark:text-bone';
  const labelCls =
    'mb-1.5 block text-label font-semibold uppercase tracking-widest text-ink-muted dark:text-stone-400';

  return (
    <div className="space-y-5">
      <div>
        <span className={labelCls}>{copy.birthday}</span>
        {birthDate ? (
          <p className="text-ink dark:text-bone text-sm">{birthDateLabel}</p>
        ) : (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!date) return;
              startTransition(async () => {
                const r = await setBirthDate(date);
                setMessage(
                  r.ok
                    ? { ok: true, text: copy.saved }
                    : { ok: false, text: copy.errors[r.error] ?? r.error },
                );
              });
            }}
          >
            <label htmlFor="lc-birth" className="sr-only">
              {copy.birthday}
            </label>
            <input
              id="lc-birth"
              type="date"
              className={fieldCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              type="submit"
              disabled={pending || !date}
              className="border-border text-ink hover:border-foreground dark:text-bone h-11 border px-4 text-xs font-semibold tracking-widest uppercase disabled:opacity-50"
            >
              {copy.birthdaySave}
            </button>
          </form>
        )}
        {!birthDate && (
          <p className="text-ink-muted mt-1.5 text-xs dark:text-stone-400">{copy.birthdayHint}</p>
        )}
      </div>

      <label className="text-ink dark:text-bone flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="accent-brass mt-0.5 h-4 w-4"
          checked={agreed}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setAgreed(next);
            startTransition(async () => {
              const r = await setMarketingConsent(next);
              if (!r.ok) setAgreed(!next);
            });
          }}
        />
        <span>{copy.consent}</span>
      </label>

      {message && (
        <p
          role="status"
          className={message.ok ? 'text-xs' : 'text-xs text-red-700 dark:text-red-400'}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
