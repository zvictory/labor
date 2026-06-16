'use client';

// Featured-products picker for a campaign. Shows the currently-selected products
// (ordered) with remove/reorder, plus a search box that queries the product
// catalog (searchProductsForPicker) to add more. On save it calls
// setCampaignProducts with the ordered id list (replace-set semantics). The
// initial selection + the search action are passed from the server page. ru labels.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { setCampaignProducts } from '@/lib/admin/campaign-actions';
import { formatUzs } from '@/lib/money';

export interface PickerProduct {
  id: number;
  slug: string;
  name: string;
  price: number;
  image: string | null;
}

interface Props {
  campaignId: number;
  locale: string;
  initialSelected: PickerProduct[];
  // Server action that searches the catalog; passed down so this client island
  // doesn't import server-only query code.
  searchAction: (q: string) => Promise<PickerProduct[]>;
}

export function FeaturedProducts({
  campaignId,
  locale,
  initialSelected,
  searchAction,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<PickerProduct[]>(initialSelected);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedIds = new Set(selected.map((p) => p.id));

  async function runSearch() {
    setSearching(true);
    const found = await searchAction(query.trim());
    setResults(found.filter((p) => !selectedIds.has(p.id)));
    setSearching(false);
  }

  function add(p: PickerProduct) {
    if (selectedIds.has(p.id)) return;
    setSelected([...selected, p]);
    setResults(results.filter((r) => r.id !== p.id));
    setSaved(false);
  }

  function remove(id: number) {
    setSelected(selected.filter((p) => p.id !== id));
    setSaved(false);
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...selected];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setSelected(next);
    setSaved(false);
  }

  function onSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setCampaignProducts(
        campaignId,
        selected.map((p) => p.id),
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Selected list */}
      {selected.length === 0 ? (
        <p className="text-sm text-ink-muted dark:text-stone-400">
          Товары не выбраны.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {selected.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="w-6 text-center text-xs text-ink-muted dark:text-stone-400">
                {i + 1}
              </span>
              {p.image ? (
                <Image
                  src={p.image}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 rounded border border-border object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded border border-dashed border-border" />
              )}
              <span className="flex-1 truncate text-sm text-ink dark:text-bone">
                {p.name}
                <span className="ml-2 text-xs text-ink-muted dark:text-stone-400">
                  {formatUzs(p.price, locale)}
                </span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded px-2 py-1 text-xs text-ink-muted hover:text-brass disabled:opacity-30 dark:text-stone-400"
                  aria-label="Вверх"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === selected.length - 1}
                  className="rounded px-2 py-1 text-xs text-ink-muted hover:text-brass disabled:opacity-30 dark:text-stone-400"
                  aria-label="Вниз"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="rounded px-2 py-1 text-xs text-rose-600 hover:text-rose-800"
                  aria-label="Удалить"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Search to add */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            className="h-10 flex-1 rounded-md border border-border bg-white px-3 text-sm text-ink outline-none focus:border-brass dark:bg-ink/40 dark:text-bone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void runSearch();
              }
            }}
            placeholder="Поиск товара по названию или slug"
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={searching}
            className="inline-flex h-10 items-center justify-center border border-border px-4 text-xs font-semibold uppercase tracking-widest text-ink hover:border-brass disabled:opacity-50 dark:text-bone"
          >
            {searching ? '…' : 'Найти'}
          </button>
        </div>
        {results.length > 0 && (
          <ul className="max-h-72 divide-y divide-border overflow-auto rounded-xl border border-border">
            {results.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-ink/[0.03] dark:hover:bg-bone/[0.04]"
              >
                {p.image ? (
                  <Image
                    src={p.image}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="h-9 w-9 rounded border border-border object-cover"
                  />
                ) : (
                  <div className="h-9 w-9 rounded border border-dashed border-border" />
                )}
                <span className="flex-1 truncate text-sm text-ink dark:text-bone">
                  {p.name}
                </span>
                <button
                  type="button"
                  onClick={() => add(p)}
                  className="rounded-md border border-border px-3 py-1 text-xs text-ink hover:border-brass dark:text-bone"
                >
                  Добавить
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-700">Сохранено.</p>}

      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="inline-flex h-10 items-center justify-center bg-ink px-5 text-xs font-semibold uppercase tracking-widest text-bone hover:bg-brass disabled:opacity-50 dark:bg-bone dark:text-ink"
      >
        {pending ? 'Сохранение…' : 'Сохранить товары'}
      </button>
    </div>
  );
}
