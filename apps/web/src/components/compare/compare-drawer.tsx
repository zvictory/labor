'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCompareStore } from '@/lib/stores/compare-store';
import { useLocale } from 'next-intl';

export const CompareDrawer = () => {
  const t = useTranslations('compare.drawer');
  const locale = useLocale();
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 overflow-x-auto">
        <span className="shrink-0 text-xs uppercase tracking-widest text-stone-500">
          {t('label')} · {items.length}/4
        </span>
        <div className="flex flex-1 gap-2">
          {items.map((p) => (
            <div key={p.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-stone-50">
              <Image src={p.image} alt={p.name} fill sizes="56px" className="object-cover" />
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={t('remove', { name: p.name })}
                className="absolute right-0 top-0 rounded-bl-md bg-white/90 px-1 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <Link
          href={`/${locale}/compare`}
          className="shrink-0 rounded-full bg-stone-900 px-4 py-2 text-xs uppercase tracking-widest text-white hover:bg-stone-800"
        >
          {t('cta')}
        </Link>
        <button
          type="button"
          onClick={clear}
          className="shrink-0 text-xs text-stone-500 hover:text-stone-900"
        >
          {t('clear')}
        </button>
      </div>
    </div>
  );
};
