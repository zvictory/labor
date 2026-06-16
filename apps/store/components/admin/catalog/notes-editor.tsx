'use client';

// Product notes pyramid editor. Notes are grouped into three layers (top/middle/
// base); within each layer the row order is the saved `position`. The editor keeps
// a flat working list and renders it grouped; on save it flattens to the action
// payload, assigning position = index-within-layer.

import { useState } from 'react';

import { setProductNotes } from '@/lib/admin/catalog-actions';
import type { SelectOption } from '@/lib/admin/catalog-queries';
import type { PyramidLayer } from '@/lib/catalog/types';

interface NoteRow {
  noteId: number;
  pyramidLayer: PyramidLayer;
}

interface InitialNote {
  noteId: number;
  noteName: string;
  pyramidLayer: PyramidLayer;
  position: number;
}

interface Props {
  productId: number;
  options: SelectOption[];
  initial: InitialNote[];
}

const LAYERS: { key: PyramidLayer; label: string }[] = [
  { key: 'top', label: 'Верхние ноты' },
  { key: 'middle', label: 'Средние ноты' },
  { key: 'base', label: 'Базовые ноты' },
];

export function NotesEditor({ productId, options, initial }: Props) {
  const [rows, setRows] = useState<NoteRow[]>(
    [...initial]
      .sort((a, b) => a.position - b.position)
      .map((n) => ({ noteId: n.noteId, pyramidLayer: n.pyramidLayer })),
  );
  const [addLayer, setAddLayer] = useState<PyramidLayer>('top');
  const [addNoteId, setAddNoteId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const labelOf = (id: number) => options.find((o) => o.id === id)?.label ?? `#${id}`;

  const addNote = () => {
    if (addNoteId === '') return;
    const exists = rows.some(
      (r) => r.noteId === addNoteId && r.pyramidLayer === addLayer,
    );
    if (exists) {
      setMsg('Эта нота уже добавлена в этот слой');
      return;
    }
    setRows([...rows, { noteId: addNoteId, pyramidLayer: addLayer }]);
    setAddNoteId('');
    setMsg(null);
  };

  const removeRow = (noteId: number, layer: PyramidLayer) =>
    setRows(rows.filter((r) => !(r.noteId === noteId && r.pyramidLayer === layer)));

  const move = (noteId: number, layer: PyramidLayer, dir: -1 | 1) => {
    const inLayer = rows.filter((r) => r.pyramidLayer === layer);
    const idx = inLayer.findIndex((r) => r.noteId === noteId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= inLayer.length) return;
    const reordered = [...inLayer];
    const a = reordered[idx]!;
    const b = reordered[target]!;
    reordered[idx] = b;
    reordered[target] = a;
    // Rebuild flat list: other layers untouched, this layer replaced in new order.
    const others = rows.filter((r) => r.pyramidLayer !== layer);
    setRows([...others, ...reordered]);
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    // Assign position per layer in current order.
    const payload = LAYERS.flatMap(({ key }) =>
      rows
        .filter((r) => r.pyramidLayer === key)
        .map((r, index) => ({ noteId: r.noteId, pyramidLayer: key, position: index })),
    );
    const res = await setProductNotes({ productId, notes: payload });
    setSaving(false);
    setMsg(res.ok ? 'Ноты сохранены' : res.error);
  };

  return (
    <div className="space-y-5">
      {LAYERS.map(({ key, label }) => {
        const inLayer = rows.filter((r) => r.pyramidLayer === key);
        return (
          <div key={key}>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
              {label}
            </h4>
            {inLayer.length === 0 ? (
              <p className="text-xs text-ink-muted">—</p>
            ) : (
              <ul className="space-y-1.5">
                {inLayer.map((r, i) => (
                  <li
                    key={`${key}-${r.noteId}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm"
                  >
                    <span className="flex-1 text-ink">{labelOf(r.noteId)}</span>
                    <button
                      type="button"
                      onClick={() => move(r.noteId, key, -1)}
                      disabled={i === 0}
                      className="px-1 text-ink-muted hover:text-ink disabled:opacity-30"
                      aria-label="Выше"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(r.noteId, key, 1)}
                      disabled={i === inLayer.length - 1}
                      className="px-1 text-ink-muted hover:text-ink disabled:opacity-30"
                      aria-label="Ниже"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(r.noteId, key)}
                      className="px-1 text-destructive hover:opacity-70"
                      aria-label="Удалить"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
        <label className="flex flex-col text-[11px] uppercase tracking-widest text-ink-muted">
          Слой
          <select
            className="mt-1 h-9 rounded-md border border-border bg-white px-2 text-sm text-ink"
            value={addLayer}
            onChange={(e) => setAddLayer(e.target.value as PyramidLayer)}
          >
            {LAYERS.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col text-[11px] uppercase tracking-widest text-ink-muted">
          Нота
          <select
            className="mt-1 h-9 rounded-md border border-border bg-white px-2 text-sm text-ink"
            value={addNoteId}
            onChange={(e) => setAddNoteId(e.target.value ? Number(e.target.value) : '')}
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
          onClick={addNote}
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
          {saving ? 'Сохранение…' : 'Сохранить ноты'}
        </button>
        {msg && <span className="text-xs text-ink-muted">{msg}</span>}
      </div>
    </div>
  );
}
