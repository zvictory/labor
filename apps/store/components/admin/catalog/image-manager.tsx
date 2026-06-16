'use client';

// Product image manager: upload (FormData → server action → MinIO + ProductImage),
// remove, and reorder. Reordering is local-first (arrows) and persisted via a
// "Save order" button calling reorderImages. After upload/remove the page
// revalidates server-side; the parent passes a fresh `images` prop on re-render,
// so we re-seed local state from props with a key reset.

import { useState, useTransition, useRef } from 'react';

import {
  addProductImage,
  removeProductImage,
  reorderImages,
} from '@/lib/admin/catalog-actions';

export interface ManagedImage {
  id: number;
  url: string;
  alt: string | null;
  position: number;
}

interface Props {
  productId: number;
  images: ManagedImage[];
}

export function ImageManager({ productId, images }: Props) {
  const [order, setOrder] = useState<ManagedImage[]>(
    [...images].sort((a, b) => a.position - b.position),
  );
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Detect a fresh server payload (ids differ) and re-seed local order.
  const serverIds = images.map((i) => i.id).join(',');
  const localIds = order.map((i) => i.id).join(',');
  if (serverIds !== localIds && !pending) {
    setOrder([...images].sort((a, b) => a.position - b.position));
  }

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setMsg(null);
    startTransition(async () => {
      const res = await addProductImage(productId, fd);
      if (!res.ok) setMsg(res.error);
      if (fileRef.current) fileRef.current.value = '';
    });
  };

  const onRemove = (imageId: number) => {
    setMsg(null);
    startTransition(async () => {
      const res = await removeProductImage(imageId);
      if (!res.ok) setMsg(res.error);
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const a = next[index]!;
    const b = next[target]!;
    next[index] = b;
    next[target] = a;
    setOrder(next);
  };

  const saveOrder = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await reorderImages({
        productId,
        orderedImageIds: order.map((i) => i.id),
      });
      setMsg(res.ok ? 'Порядок сохранён' : res.error);
    });
  };

  const dirty = order.map((i) => i.id).join(',') !== localIds;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex h-10 cursor-pointer items-center rounded-md bg-secondary px-4 text-sm font-medium text-ink hover:bg-brass/15">
          {pending ? 'Загрузка…' : 'Загрузить изображение'}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            className="sr-only"
            onChange={onUpload}
            disabled={pending}
          />
        </label>
        {dirty && (
          <button
            type="button"
            onClick={saveOrder}
            disabled={pending}
            className="h-10 rounded-md bg-ink px-4 text-xs font-semibold uppercase tracking-widest text-bone hover:bg-brass disabled:opacity-50"
          >
            Сохранить порядок
          </button>
        )}
        {msg && <span className="text-xs text-ink-muted">{msg}</span>}
      </div>

      {order.length === 0 ? (
        <p className="text-xs text-ink-muted">Изображений нет.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {order.map((img, i) => (
            <li
              key={img.id}
              className="group relative overflow-hidden rounded-md border border-border bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt ?? ''}
                className="aspect-square w-full object-cover"
              />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-ink/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-bone">
                  Главное
                </span>
              )}
              <div className="flex items-center justify-between border-t border-border px-1.5 py-1">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || pending}
                    className="px-1 text-ink-muted hover:text-ink disabled:opacity-30"
                    aria-label="Влево"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === order.length - 1 || pending}
                    className="px-1 text-ink-muted hover:text-ink disabled:opacity-30"
                    aria-label="Вправо"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(img.id)}
                  disabled={pending}
                  className="px-1 text-destructive hover:opacity-70 disabled:opacity-30"
                  aria-label="Удалить"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
