'use client';

// "Help me choose": phone, optional name and a line about taste. The shop's
// version of the call-back form Uzbek shops put next to every product — for a
// fragrance, a conversation sells better than a filter.

import { useActionState, useEffect, useId } from 'react';
import { useTranslations } from 'next-intl';

import { submitConsultRequest, type ConsultFormState } from '@/lib/consult/actions';
import type { ConsultSource } from '@/lib/consult/request';
import { track } from '@/lib/analytics';
import { TELEGRAM_URL } from '@/lib/telegram';

const fieldCls =
  'h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-ink ' +
  'transition-colors focus:border-foreground dark:bg-ink/40 dark:text-bone';
const labelCls =
  'mb-1.5 block text-label font-semibold uppercase tracking-widest text-ink-muted dark:text-stone-400';

export function ConsultForm({
  locale,
  source,
  productSlug,
  showHeading = true,
}: {
  locale: string;
  source: ConsultSource;
  productSlug?: string;
  showHeading?: boolean;
}) {
  // The corporate page asks three more things; they reach staff as labelled
  // lines of the message (lib/consult/actions.ts).
  const corporate = source === 'corporate';
  const t = useTranslations('consult');
  const id = useId();
  const [state, action, pending] = useActionState<ConsultFormState, FormData>(
    submitConsultRequest,
    null,
  );

  useEffect(() => {
    if (state?.ok) track('generate_lead', { source }, { eventId: state.eventId });
  }, [state, source]);

  if (state?.ok) {
    return (
      <p role="status" className="border-border border p-5 text-sm">
        {t('success')}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {showHeading && (
        <div className="space-y-1">
          <h2 className="font-display text-2xl">{t('title')}</h2>
          <p className="text-muted-foreground max-w-prose text-sm">{t('lead')}</p>
        </div>
      )}

      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="locale" value={locale} />
      {productSlug && <input type="hidden" name="productSlug" value={productSlug} />}
      {/* Honeypot — off-screen and out of the tab order; people leave it empty. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-phone`} className={labelCls}>
            {t('phone')}
          </label>
          <input
            id={`${id}-phone`}
            name="phone"
            className={fieldCls}
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('phonePlaceholder')}
            defaultValue={state?.values?.phone}
            required
            aria-invalid={state?.ok === false && state.error === 'invalid_phone'}
            aria-describedby={state?.ok === false ? `${id}-error` : undefined}
          />
        </div>
        <div>
          <label htmlFor={`${id}-name`} className={labelCls}>
            {t('name')}
          </label>
          <input
            id={`${id}-name`}
            name="name"
            className={fieldCls}
            autoComplete="given-name"
            maxLength={80}
            defaultValue={state?.values?.name}
          />
        </div>
      </div>

      {corporate && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(['company', 'quantity', 'date'] as const).map((field) => (
            <div key={field}>
              <label htmlFor={`${id}-${field}`} className={labelCls}>
                {t(field)}
              </label>
              <input
                id={`${id}-${field}`}
                name={field}
                maxLength={160}
                className={fieldCls}
                defaultValue={state?.values?.[field]}
              />
            </div>
          ))}
        </div>
      )}

      <div>
        <label htmlFor={`${id}-message`} className={labelCls}>
          {t('message')}
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={3}
          maxLength={1000}
          placeholder={t('messagePlaceholder')}
          defaultValue={state?.values?.message}
          className={`${fieldCls} h-auto py-2`}
        />
      </div>

      {state?.ok === false && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-700 dark:text-red-400">
          {state.error === 'invalid_phone' ? (
            t('errorPhone')
          ) : (
            <>
              {t('errorGeneric')}{' '}
              <a href={TELEGRAM_URL} className="underline underline-offset-4">
                Telegram
              </a>
            </>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-12 items-center justify-center px-7 text-xs font-semibold tracking-widest uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? t('sending') : t('submit')}
      </button>
    </form>
  );
}
