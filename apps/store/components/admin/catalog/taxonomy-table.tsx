'use client';

// Generic taxonomy table with inline create + edit, used by the brands / notes /
// accords / perfumers admin pages. Each page declares a field schema and an
// `onSubmit` adapter that maps the row's working values to the right server action;
// this component owns the table chrome, the add/edit forms, and delete.
//
// Field kinds:
//   - 'text'        single-line string
//   - 'localeText'  { ru, uz, en } via LocaleTextInput (ru required unless optional)
//   - 'boolean'     checkbox
//   - 'color'       hex color input

import { useState, useTransition } from 'react';

import type { ActionResult } from '@/lib/admin/catalog-actions';
import type { LocaleText } from '@/lib/catalog/types';
import { LocaleTextInput } from '@/components/admin/catalog/locale-text-input';
import { resolveLocaleText } from '@/lib/catalog/locale';

export type FieldKind = 'text' | 'localeText' | 'boolean' | 'color';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  /** Shown in the table column header; omit to hide from the table. */
  column?: boolean;
}

/** A working row value: string | boolean | LocaleText keyed by field key, plus id. */
export type RowValues = Record<string, string | boolean | LocaleText>;

export interface TaxonomyRow {
  id: number;
  values: RowValues;
  productCount: number;
}

interface Props {
  title: string;
  fields: FieldDef[];
  rows: TaxonomyRow[];
  /** Save adapter: receives id (undefined = create) + working values. */
  onSubmit: (id: number | undefined, values: RowValues) => Promise<ActionResult>;
  onDelete: (id: number) => Promise<ActionResult>;
  /** Initial values for a fresh "add" row. */
  emptyValues: RowValues;
}

const labelCls =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted';
const fieldCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-ink ' +
  'outline-none transition-colors focus:border-brass';

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string | boolean | LocaleText;
  onChange: (v: string | boolean | LocaleText) => void;
}) {
  if (field.kind === 'localeText') {
    return (
      <LocaleTextInput
        label={field.label}
        value={(value as LocaleText) ?? { ru: '' }}
        onChange={onChange}
        ruRequired={field.required ?? true}
      />
    );
  }
  if (field.kind === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="accent-brass"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  }
  return (
    <div>
      <span className={labelCls}>
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </span>
      <input
        type="text"
        className={fieldCls}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.kind === 'color' ? '#8B6F47' : undefined}
        required={field.required}
      />
    </div>
  );
}

function renderCell(field: FieldDef, value: string | boolean | LocaleText): string {
  if (field.kind === 'localeText') return resolveLocaleText(value as LocaleText, 'ru');
  if (field.kind === 'boolean') return value ? 'да' : 'нет';
  return typeof value === 'string' ? value : '';
}

export function TaxonomyTable({
  title,
  fields,
  rows,
  onSubmit,
  onDelete,
  emptyValues,
}: Props) {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<RowValues>(emptyValues);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns = fields.filter((f) => f.column);

  const startNew = () => {
    setEditingId('new');
    setDraft(emptyValues);
    setError(null);
  };
  const startEdit = (row: TaxonomyRow) => {
    setEditingId(row.id);
    setDraft({ ...row.values });
    setError(null);
  };
  const cancel = () => {
    setEditingId(null);
    setError(null);
  };

  const setField = (key: string, v: string | boolean | LocaleText) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const id = editingId === 'new' ? undefined : (editingId as number);
      const res = await onSubmit(id, draft);
      if (res.ok) setEditingId(null);
      else setError(res.error);
    });
  };

  const remove = (id: number) => {
    setError(null);
    startTransition(async () => {
      const res = await onDelete(id);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-ink">{title}</h1>
        <button
          type="button"
          onClick={startNew}
          className="h-10 rounded-md bg-ink px-5 text-xs font-semibold uppercase tracking-widest text-bone hover:bg-brass"
        >
          Добавить
        </button>
      </div>

      {editingId !== null && (
        <div className="space-y-4 rounded-lg border border-brass/40 bg-brass/5 p-5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
            {editingId === 'new' ? 'Новая запись' : 'Редактирование'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={draft[f.key] ?? (f.kind === 'localeText' ? { ru: '' } : f.kind === 'boolean' ? false : '')}
                onChange={(v) => setField(f.key, v)}
              />
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="h-10 rounded-md bg-ink px-6 text-xs font-semibold uppercase tracking-widest text-bone hover:bg-brass disabled:opacity-50"
            >
              {pending ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="h-10 rounded-md border border-border px-6 text-sm text-ink-muted hover:text-ink"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {error && editingId === null && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-secondary/50 text-[11px] uppercase tracking-widest text-ink-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-semibold">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 font-semibold">Продукты</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-4 py-6 text-center text-ink-muted">
                  Пусто
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-ink">
                      {c.kind === 'color' && typeof row.values[c.key] === 'string' && row.values[c.key] ? (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-4 w-4 rounded-full border border-border"
                            style={{ backgroundColor: String(row.values[c.key]) }}
                          />
                          {String(row.values[c.key])}
                        </span>
                      ) : (
                        renderCell(c, row.values[c.key] ?? '')
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-ink-muted">{row.productCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="mr-3 text-brass hover:underline"
                    >
                      Изм.
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(row.id)}
                      disabled={pending || row.productCount > 0}
                      title={row.productCount > 0 ? 'Используется продуктами' : undefined}
                      className="text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Удал.
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
