'use client';

// Product scalar form: slug, per-locale name/description, status, price (integer
// UZS so'm), gender, concentration, brand. Notes/accords/perfumers/images are
// edited by their own islands on the edit page (they need a saved product id), so
// this form owns only the Product + FragranceDetail scalar fields.
//
// On submit it calls upsertProduct. For a new product it redirects to the edit
// page of the created id (where the relation editors become available).

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { upsertProduct, type UpsertProductInput } from '@/lib/admin/catalog-actions';
import type { SelectOption } from '@/lib/admin/catalog-queries';
import type { LocaleText } from '@/lib/catalog/types';
import { LocaleTextInput } from '@/components/admin/catalog/locale-text-input';

interface Props {
  locale: string;
  brands: SelectOption[];
  initial?: {
    id: number;
    slug: string;
    name: LocaleText;
    description: LocaleText;
    status: string;
    price: number;
    gender: string;
    concentration: string;
    brandId: number | null;
  };
}

const STATUSES = [
  { value: 'active', label: 'Активен' },
  { value: 'draft', label: 'Черновик' },
  { value: 'archived', label: 'Архив' },
];
const GENDERS = [
  { value: 'unisex', label: 'Унисекс' },
  { value: 'men', label: 'Мужской' },
  { value: 'women', label: 'Женский' },
];

const labelCls = 'mb-1.5 block text-label font-semibold uppercase tracking-widest text-ink-muted';
const fieldCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-ink ' +
  'transition-colors focus:border-foreground';

export function ProductForm({ locale, brands, initial }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [name, setName] = useState<LocaleText>(initial?.name ?? { ru: '' });
  const [description, setDescription] = useState<LocaleText>(initial?.description ?? { ru: '' });
  const [status, setStatus] = useState(initial?.status ?? 'draft');
  const [price, setPrice] = useState<string>(String(initial?.price ?? 0));
  const [gender, setGender] = useState(initial?.gender ?? 'unisex');
  const [concentration, setConcentration] = useState(initial?.concentration ?? '');
  const [brandId, setBrandId] = useState<number | ''>(initial?.brandId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOkMsg(null);

    const input: UpsertProductInput = {
      ...(initial ? { id: initial.id } : {}),
      slug: slug.trim(),
      name: { ru: name.ru, uz: name.uz, en: name.en },
      description: { ru: description.ru, uz: description.uz, en: description.en },
      status: status as 'active' | 'draft' | 'archived',
      price: Math.max(0, Math.round(Number(price) || 0)),
      gender: gender as 'men' | 'women' | 'unisex',
      concentration: concentration.trim() || undefined,
      brandId: brandId === '' ? null : brandId,
    };

    startTransition(async () => {
      const res = await upsertProduct(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (!initial && res.id) {
        router.push(`/${locale}/admin/catalog/${res.id}`);
      } else {
        setOkMsg('Сохранено');
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-slug" className={labelCls}>
            Slug <span className="text-destructive">*</span>
          </label>
          <input
            id="pf-slug"
            className={fieldCls}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="dior-sauvage-edp"
            required
          />
        </div>
        <div>
          <label htmlFor="pf-price" className={labelCls}>
            Цена, сум (целое) <span className="text-destructive">*</span>
          </label>
          <input
            id="pf-price"
            type="number"
            min={0}
            step={1}
            className={fieldCls}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
      </div>

      <LocaleTextInput label="Название" value={name} onChange={setName} />
      <LocaleTextInput
        label="Описание"
        value={description}
        onChange={setDescription}
        multiline
        ruRequired={false}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="pf-status" className={labelCls}>
            Статус
          </label>
          <select
            id="pf-status"
            className={fieldCls}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pf-gender" className={labelCls}>
            Пол
          </label>
          <select
            id="pf-gender"
            className={fieldCls}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pf-conc" className={labelCls}>
            Концентрация
          </label>
          <input
            id="pf-conc"
            className={fieldCls}
            value={concentration}
            onChange={(e) => setConcentration(e.target.value)}
            placeholder="EDP, EDT…"
          />
        </div>
      </div>

      <div>
        <label htmlFor="pf-brand" className={labelCls}>
          Бренд
        </label>
        <select
          id="pf-brand"
          className={fieldCls + ' max-w-sm'}
          value={brandId}
          onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">— без бренда —</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-4 py-2 text-sm">
          {error}
        </p>
      )}
      {okMsg && <p className="text-brass text-sm">{okMsg}</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-bone hover:bg-brass inline-flex h-11 items-center justify-center rounded-md px-8 text-xs font-semibold tracking-widest uppercase transition-colors disabled:opacity-50"
      >
        {pending ? 'Сохранение…' : initial ? 'Сохранить' : 'Создать продукт'}
      </button>
    </form>
  );
}
