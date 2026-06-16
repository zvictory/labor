'use client';

// Product perfumers editor — a simple checklist of all perfumers; the checked set
// is the credited list. Replace-all on save via setProductPerfumers.

import { useState } from 'react';

import { setProductPerfumers } from '@/lib/admin/catalog-actions';
import type { SelectOption } from '@/lib/admin/catalog-queries';

interface Props {
  productId: number;
  options: SelectOption[];
  initialPerfumerIds: number[];
}

export function PerfumersEditor({ productId, options, initialPerfumerIds }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set(initialPerfumerIds));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await setProductPerfumers({
      productId,
      perfumerIds: Array.from(selected),
    });
    setSaving(false);
    setMsg(res.ok ? 'Парфюмеры сохранены' : res.error);
  };

  return (
    <div className="space-y-4">
      {options.length === 0 ? (
        <p className="text-xs text-ink-muted">Парфюмеры не созданы.</p>
      ) : (
        <div className="grid max-h-60 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
          {options.map((o) => {
            const checked = selected.has(o.id);
            return (
              <label
                key={o.id}
                className={
                  'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ' +
                  (checked
                    ? 'border-brass bg-brass/5 text-ink'
                    : 'border-border text-ink-muted hover:border-brass/50')
                }
              >
                <input
                  type="checkbox"
                  className="accent-brass"
                  checked={checked}
                  onChange={() => toggle(o.id)}
                />
                <span className="truncate">{o.label}</span>
              </label>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-10 rounded-md bg-ink px-6 text-xs font-semibold uppercase tracking-widest text-bone hover:bg-brass disabled:opacity-50"
        >
          {saving ? 'Сохранение…' : 'Сохранить парфюмеров'}
        </button>
        {msg && <span className="text-xs text-ink-muted">{msg}</span>}
      </div>
    </div>
  );
}
