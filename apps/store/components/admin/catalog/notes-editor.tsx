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
    const exists = rows.some((r) => r.noteId === addNoteId && r.pyramidLayer === addLayer);
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
            <h4 className="text-muted-foreground text-micro mb-2 font-mono tracking-[0.28em] uppercase">
              {label}
            </h4>
            {inLayer.length === 0 ? (
              <p className="text-ink-muted text-xs">—</p>
            ) : (
              <ul className="space-y-1.5">
                {inLayer.map((r, i) => (
                  <li
                    key={`${key}-${r.noteId}`}
                    className="border-border flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm"
                  >
                    <span className="text-ink flex-1">{labelOf(r.noteId)}</span>
                    <button
                      type="button"
                      onClick={() => move(r.noteId, key, -1)}
                      disabled={i === 0}
                      className="text-ink-muted hover:text-ink px-1 disabled:opacity-30"
                      aria-label="Выше"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(r.noteId, key, 1)}
                      disabled={i === inLayer.length - 1}
                      className="text-ink-muted hover:text-ink px-1 disabled:opacity-30"
                      aria-label="Ниже"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(r.noteId, key)}
                      className="text-destructive px-1 hover:opacity-70"
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

      <div className="border-border flex flex-wrap items-end gap-2 border-t pt-4">
        <label className="text-label text-ink-muted flex flex-col tracking-widest uppercase">
          Слой
          <select
            className="border-border text-ink mt-1 h-9 rounded-md border bg-white px-2 text-sm"
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
        <label className="text-label text-ink-muted flex flex-1 flex-col tracking-widest uppercase">
          Нота
          <select
            className="border-border text-ink mt-1 h-9 rounded-md border bg-white px-2 text-sm"
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
          {saving ? 'Сохранение…' : 'Сохранить ноты'}
        </button>
        {msg && <span className="text-ink-muted text-xs">{msg}</span>}
      </div>
    </div>
  );
}
