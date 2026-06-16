'use client';

// Campaign slide editor. Lists existing slides for a campaign and lets the
// operator add/edit/delete them. Each slide has an image (uploaded via the
// addSlideImage FormData action → putObject), an optional link URL, per-locale
// title/subtitle/cta, and a position. New slides are added via an inline blank
// editor row. ru-primary labels.

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import {
  upsertSlide,
  deleteSlide,
  addSlideImage,
  type UpsertSlideInput,
} from '@/lib/admin/campaign-actions';
import type { LocaleText } from '@/lib/catalog/types';

type Locale = 'ru' | 'uz' | 'en';
const LOCALES: { key: Locale; label: string }[] = [
  { key: 'ru', label: 'RU' },
  { key: 'uz', label: 'UZ' },
  { key: 'en', label: 'EN' },
];

export interface SlideInitial {
  id: number;
  imageUrl: string | null;
  linkUrl: string | null;
  title: LocaleText | null;
  subtitle: LocaleText | null;
  ctaLabel: LocaleText | null;
  position: number;
}

interface Props {
  campaignId: number;
  slides: SlideInitial[];
}

type LocaleState = { ru: string; uz: string; en: string };
const toLocaleState = (lt: LocaleText | null | undefined): LocaleState => ({
  ru: lt?.ru ?? '',
  uz: lt?.uz ?? '',
  en: lt?.en ?? '',
});
const buildLocaleText = (s: LocaleState): { ru: string; uz?: string; en?: string } => ({
  ru: s.ru.trim(),
  ...(s.uz.trim() ? { uz: s.uz.trim() } : {}),
  ...(s.en.trim() ? { en: s.en.trim() } : {}),
});

const fieldCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-brass dark:bg-ink/40 dark:text-bone';
const labelCls =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted dark:text-stone-400';

export function SlideEditor({ campaignId, slides }: Props) {
  return (
    <div className="space-y-4">
      {slides.map((slide) => (
        <SlideCard key={slide.id} campaignId={campaignId} slide={slide} />
      ))}
      <NewSlideCard campaignId={campaignId} nextPosition={slides.length} />
    </div>
  );
}

function SlideCard({ campaignId, slide }: { campaignId: number; slide: SlideInitial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState(slide.imageUrl ?? '');
  const [linkUrl, setLinkUrl] = useState(slide.linkUrl ?? '');
  const [position, setPosition] = useState(slide.position);
  const [title, setTitle] = useState<LocaleState>(toLocaleState(slide.title));
  const [subtitle, setSubtitle] = useState<LocaleState>(toLocaleState(slide.subtitle));
  const [cta, setCta] = useState<LocaleState>(toLocaleState(slide.ctaLabel));

  async function onPickFile(file: File) {
    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.set('file', file);
    fd.set('campaignId', String(campaignId));
    fd.set('slideId', String(slide.id)); // attach immediately to this slide
    const result = await addSlideImage(fd);
    setUploading(false);
    if (!result.ok) {
      setError(`Загрузка не удалась: ${result.error}`);
      return;
    }
    setImageUrl(result.data?.url ?? '');
    router.refresh();
  }

  function onSave() {
    setError(null);
    const input: UpsertSlideInput = {
      id: slide.id,
      campaignId,
      imageUrl: imageUrl.trim(),
      linkUrl: linkUrl.trim(),
      title: buildLocaleText(title),
      subtitle: buildLocaleText(subtitle),
      ctaLabel: buildLocaleText(cta),
      position,
    };
    startTransition(async () => {
      const result = await upsertSlide(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (!window.confirm('Удалить слайд?')) return;
    startTransition(async () => {
      const result = await deleteSlide(slide.id, campaignId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={120}
              height={80}
              unoptimized
              className="h-20 w-32 rounded-md border border-border object-cover"
            />
          ) : (
            <div className="flex h-20 w-32 items-center justify-center rounded-md border border-dashed border-border text-xs text-ink-muted dark:text-stone-400">
              нет фото
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-2 w-full rounded-md border border-border px-2 py-1 text-xs text-ink hover:border-brass disabled:opacity-50 dark:text-bone"
          >
            {uploading ? 'Загрузка…' : 'Загрузить'}
          </button>
        </div>

        <div className="flex-1 space-y-3">
          <LocaleRow id={`slide-${slide.id}-title`} legend="Заголовок" value={title} setValue={setTitle} />
          <LocaleRow id={`slide-${slide.id}-sub`} legend="Подзаголовок" value={subtitle} setValue={setSubtitle} />
          <LocaleRow id={`slide-${slide.id}-cta`} legend="CTA" value={cta} setValue={setCta} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Ссылка</label>
              <input
                className={fieldCls}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div>
              <label className={labelCls}>Позиция</label>
              <input
                type="number"
                min={0}
                className={fieldCls}
                value={position}
                onChange={(e) => setPosition(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="inline-flex h-9 items-center justify-center bg-ink px-4 text-xs font-semibold uppercase tracking-widest text-bone hover:bg-brass disabled:opacity-50 dark:bg-bone dark:text-ink"
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex h-9 items-center justify-center border border-rose-300 px-4 text-xs font-semibold uppercase tracking-widest text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          Удалить
        </button>
      </div>
    </div>
  );
}

function NewSlideCard({
  campaignId,
  nextPosition,
}: {
  campaignId: number;
  nextPosition: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await upsertSlide({ campaignId, position: nextPosition });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-4 text-center">
      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        onClick={onCreate}
        disabled={pending}
        className="inline-flex h-9 items-center justify-center px-4 text-xs font-semibold uppercase tracking-widest text-ink hover:text-brass disabled:opacity-50 dark:text-bone"
      >
        {pending ? '…' : '+ Добавить слайд'}
      </button>
    </div>
  );
}

function LocaleRow({
  id,
  legend,
  value,
  setValue,
}: {
  id: string;
  legend: string;
  value: LocaleState;
  setValue: (v: LocaleState) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.25em] text-brass">
        {legend}
      </span>
      <div className="grid gap-2 sm:grid-cols-3">
        {LOCALES.map((l) => (
          <input
            key={l.key}
            id={`${id}-${l.key}`}
            aria-label={`${legend} ${l.label}`}
            className={fieldCls}
            placeholder={l.label}
            value={value[l.key]}
            onChange={(e) => setValue({ ...value, [l.key]: e.target.value })}
          />
        ))}
      </div>
    </div>
  );
}
