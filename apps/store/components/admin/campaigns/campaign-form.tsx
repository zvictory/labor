'use client';

// Campaign core-fields editor (create + edit). Controlled per-locale text fields
// for title/subtitle/body/cta (ru required), slug, hero image URL, active toggle,
// and optional start/end dates. Dispatches upsertCampaign inside a transition; on
// a successful CREATE it navigates to the edit page (so slides/products can then
// be added). ru-primary labels.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { upsertCampaign, type UpsertCampaignInput } from '@/lib/admin/campaign-actions';
import type { LocaleText } from '@/lib/catalog/types';

type Locale = 'ru' | 'uz' | 'en';
const LOCALES: { key: Locale; label: string }[] = [
  { key: 'ru', label: 'RU' },
  { key: 'uz', label: 'UZ' },
  { key: 'en', label: 'EN' },
];

export interface CampaignFormInitial {
  id?: number;
  slug: string;
  title: LocaleText;
  subtitle: LocaleText | null;
  body: LocaleText | null;
  ctaLabel: LocaleText | null;
  heroImage: string | null;
  active: boolean;
  startsAt: string | null; // yyyy-mm-dd
  endsAt: string | null;
}

interface Props {
  locale: string; // UI locale (for navigation)
  initial?: CampaignFormInitial;
}

type LocaleState = { ru: string; uz: string; en: string };

const toLocaleState = (lt: LocaleText | null | undefined): LocaleState => ({
  ru: lt?.ru ?? '',
  uz: lt?.uz ?? '',
  en: lt?.en ?? '',
});

const ERROR_LABEL: Record<string, string> = {
  slug_taken: 'Такой slug уже занят',
  slug_format: 'Slug: только строчные латинские буквы, цифры и дефис',
  invalid_input: 'Проверьте заполнение полей',
  unexpected: 'Произошла ошибка',
};

export function CampaignForm({ locale, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [title, setTitle] = useState<LocaleState>(toLocaleState(initial?.title));
  const [subtitle, setSubtitle] = useState<LocaleState>(toLocaleState(initial?.subtitle));
  const [body, setBody] = useState<LocaleState>(toLocaleState(initial?.body));
  const [cta, setCta] = useState<LocaleState>(toLocaleState(initial?.ctaLabel));
  const [heroImage, setHeroImage] = useState(initial?.heroImage ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? '');
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? '');

  const fieldCls =
    'h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-brass dark:bg-ink/40 dark:text-bone';
  const labelCls =
    'mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted dark:text-stone-400';
  const sectionTitleCls = 'text-[10px] font-bold uppercase tracking-[0.3em] text-brass';

  function localeRow(
    id: string,
    value: LocaleState,
    setValue: (v: LocaleState) => void,
    opts?: { multiline?: boolean; requiredRu?: boolean },
  ) {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        {LOCALES.map((l) => (
          <div key={l.key}>
            <label htmlFor={`${id}-${l.key}`} className={labelCls}>
              {l.label}
              {opts?.requiredRu && l.key === 'ru' ? ' *' : ''}
            </label>
            {opts?.multiline ? (
              <textarea
                id={`${id}-${l.key}`}
                rows={3}
                className={`${fieldCls} h-auto py-2`}
                value={value[l.key]}
                onChange={(e) => setValue({ ...value, [l.key]: e.target.value })}
              />
            ) : (
              <input
                id={`${id}-${l.key}`}
                className={fieldCls}
                value={value[l.key]}
                onChange={(e) => setValue({ ...value, [l.key]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  function buildLocaleText(s: LocaleState): { ru: string; uz?: string; en?: string } {
    return {
      ru: s.ru.trim(),
      ...(s.uz.trim() ? { uz: s.uz.trim() } : {}),
      ...(s.en.trim() ? { en: s.en.trim() } : {}),
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!title.ru.trim()) {
      setError('Заголовок (RU) обязателен');
      return;
    }
    if (!slug.trim()) {
      setError('Slug обязателен');
      return;
    }

    const input: UpsertCampaignInput = {
      ...(initial?.id ? { id: initial.id } : {}),
      slug: slug.trim(),
      title: buildLocaleText(title),
      subtitle: buildLocaleText(subtitle),
      body: buildLocaleText(body),
      ctaLabel: buildLocaleText(cta),
      heroImage: heroImage.trim(),
      active,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    };

    startTransition(async () => {
      const result = await upsertCampaign(input);
      if (!result.ok) {
        setError(ERROR_LABEL[result.error] ?? result.error);
        return;
      }
      setSaved(true);
      const newId = result.data?.id;
      if (!initial?.id && newId) {
        // First save of a new campaign → go to its edit page for slides/products.
        router.push(`/${locale}/admin/campaigns/${newId}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-4">
        <h2 className={sectionTitleCls}>Основное</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cf-slug" className={labelCls}>
              Slug *
            </label>
            <input
              id="cf-slug"
              className={fieldCls}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="summer-sale"
            />
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink dark:text-bone">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brass"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Активна
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={sectionTitleCls}>Заголовок *</h2>
        {localeRow('cf-title', title, setTitle, { requiredRu: true })}
      </section>

      <section className="space-y-3">
        <h2 className={sectionTitleCls}>Подзаголовок</h2>
        {localeRow('cf-subtitle', subtitle, setSubtitle)}
      </section>

      <section className="space-y-3">
        <h2 className={sectionTitleCls}>Текст</h2>
        {localeRow('cf-body', body, setBody, { multiline: true })}
      </section>

      <section className="space-y-3">
        <h2 className={sectionTitleCls}>Кнопка (CTA)</h2>
        {localeRow('cf-cta', cta, setCta)}
      </section>

      <section className="space-y-4">
        <h2 className={sectionTitleCls}>Оформление и период</h2>
        <div>
          <label htmlFor="cf-hero" className={labelCls}>
            Hero image URL
          </label>
          <input
            id="cf-hero"
            className={fieldCls}
            value={heroImage}
            onChange={(e) => setHeroImage(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cf-starts" className={labelCls}>
              Начало
            </label>
            <input
              id="cf-starts"
              type="date"
              className={fieldCls}
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="cf-ends" className={labelCls}>
              Окончание
            </label>
            <input
              id="cf-ends"
              type="date"
              className={fieldCls}
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Сохранено.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center bg-ink px-7 text-xs font-semibold uppercase tracking-widest text-bone transition-colors hover:bg-brass disabled:cursor-not-allowed disabled:opacity-50 dark:bg-bone dark:text-ink"
      >
        {pending ? 'Сохранение…' : initial?.id ? 'Сохранить' : 'Создать кампанию'}
      </button>
    </form>
  );
}
