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

  const removeRow = (accordId: number) => setRows(rows.filter((r) => r.accordId !== accordId));

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
        <p className="text-ink-muted text-xs">Аккорды не добавлены.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.accordId}
              className="border-border flex items-center gap-3 rounded-md border bg-white px-3 py-2"
            >
              <span className="text-ink w-40 truncate text-sm">{labelOf(r.accordId)}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={r.weight}
                onChange={(e) => setWeight(r.accordId, Number(e.target.value))}
                className="accent-brass flex-1"
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
                className="border-border text-ink w-16 rounded-md border bg-white px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removeRow(r.accordId)}
                className="text-destructive px-1 hover:opacity-70"
                aria-label="Удалить"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-border flex items-end gap-2 border-t pt-4">
        <label className="text-label text-ink-muted flex flex-1 flex-col tracking-widest uppercase">
          Аккорд
          <select
            className="border-border text-ink mt-1 h-9 rounded-md border bg-white px-2 text-sm"
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
          className="bg-secondary text-ink hover:bg-brass/15 h-9 rounded-md px-4 text-sm font-medium"
        >
          Добавить
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-ink text-bone hover:bg-brass h-10 rounded-md px-6 text-xs font-semibold tracking-widest uppercase disabled:opacity-50"
        >
          {saving ? 'Сохранение…' : 'Сохранить аккорды'}
        </button>
        {msg && <span className="text-ink-muted text-xs">{msg}</span>}
      </div>
    </div>
  );
}
