'use client';

// Product accords editor. Each accord carries a 0–100 weight (drives the accord
// bar widths on the PDP). Replace-all semantics: the editor sends the full set on
// save and setProductAccords rewrites the join rows.

import { useState } from 'react';

import { setProductAccords } from '@/lib/admin/catalog-actions';
import type { SelectOption } from '@/lib/admin/catalog-queries';

interface AccordRow {
  accordId: number;
  weight: number;
}

interface InitialAccord {
  accordId: number;
  accordName: string;
  colorHex: string | null;
  weight: number;
}

interface Props {
  productId: number;
  options: SelectOption[];
  initial: InitialAccord[];
}

export function AccordsEditor({ productId, options, initial }: Props) {
  const [rows, setRows] = useState<AccordRow[]>(
    initial.map((a) => ({ accordId: a.accordId, weight: a.weight })),
  );
  const [addAccordId, setAddAccordId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const labelOf = (id: number) => options.find((o) => o.id === id)?.label ?? `#${id}`;

  const addAccord = () => {
    if (addAccordId === '') return;
    if (rows.some((r) => r.accordId === addAccordId)) {
      setMsg('Этот аккорд уже добавлен');
      return;
    }
    setRows([...rows, { accordId: addAccordId, weight: 50 }]);
    setAddAccordId('');
    setMsg(null);
  };

  const setWeight = (accordId: number, weight: number) =>
    setRows(rows.map((r) => (r.accordId === accordId ? { ...r, weight } : r)));

  const removeRow = (accordId: number) =>
    setRows(rows.filter((r) => r.accordId !== accordId));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await setProductAccords({ productId, accords: rows });
    setSaving(false);
    setMsg(res.ok ? 'Аккорды сохранены' : res.error);
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-xs text-ink-muted">Аккорды не добавлены.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.accordId}
              className="flex items-center gap-3 rounded-md border border-border bg-white px-3 py-2"
            >
              <span className="w-40 truncate text-sm text-ink">{labelOf(r.accordId)}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={r.weight}
                onChange={(e) => setWeight(r.accordId, Number(e.target.value))}
                className="flex-1 accent-brass"
                aria-label={`Вес: ${labelOf(r.accordId)}`}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={r.weight}
                onChange={(e) =>
                  setWeight(r.accordId, Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                }
                className="w-16 rounded-md border border-border bg-white px-2 py-1 text-sm text-ink"
              />
              <button
                type="button"
                onClick={() => removeRow(r.accordId)}
                className="px-1 text-destructive hover:opacity-70"
                aria-label="Удалить"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2 border-t border-border pt-4">
        <label className="flex flex-1 flex-col text-[11px] uppercase tracking-widest text-ink-muted">
          Аккорд
          <select
            className="mt-1 h-9 rounded-md border border-border bg-white px-2 text-sm text-ink"
            value={addAccordId}
            onChange={(e) => setAddAccordId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">—</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={addAccord}
          className="h-9 rounded-md bg-secondary px-4 text-sm font-medium text-ink hover:bg-brass/15"
        >
          Добавить
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-10 rounded-md bg-ink px-6 text-xs font-semibold uppercase tracking-widest text-bone hover:bg-brass disabled:opacity-50"
        >
          {saving ? 'Сохранение…' : 'Сохранить аккорды'}
        </button>
        {msg && <span className="text-xs text-ink-muted">{msg}</span>}
      </div>
    </div>
  );
}
