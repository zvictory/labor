import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { FragranceAccord } from '@/lib/api/products';
import { getReadableTextColor } from '@/lib/color-contrast';

interface Props {
  accords: FragranceAccord[];
  locale: string;
}

export const AccordsBars = ({ accords, locale }: Props) => {
  const t = useTranslations('pdp.accords');
  const sorted = [...accords].sort((a, b) => b.weight - a.weight).slice(0, 10);
  if (sorted.length === 0) return null;

  return (
    <section className="space-y-4 flex flex-col items-center" aria-labelledby="accords-heading">
      <h2 
        id="accords-heading" 
        className="font-sans text-lg font-semibold tracking-wide text-stone-700 dark:text-stone-300 text-center"
      >
        main accords
      </h2>
      <ul className="w-full max-w-[320px] space-y-1.5">
        {sorted.map((a) => {
          const width = Math.max(20, Math.min(100, a.weight));
          const bg = a.color_hex || '#cbd5e1';
          return (
            <li key={a.id} className="w-full">
              <div
                className="flex h-7 w-full items-center justify-center rounded-md px-3 text-[11px] font-medium lowercase tracking-wide transition-all duration-300 shadow-xs"
                style={{
                  width: `${width}%`,
                  backgroundColor: bg,
                  color: getReadableTextColor(bg),
                }}
                aria-label={`${a.name}: ${a.weight}%`}
              >
                <span className="truncate">{a.name}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="pt-2">
        <Link
          href={`/${locale}/notes`}
          className="inline-flex h-9 items-center justify-center rounded-full border border-teal-600/20 bg-teal-50/40 px-6 text-xs font-medium text-teal-800 transition-colors hover:bg-teal-50 hover:text-teal-900 dark:border-teal-500/20 dark:bg-teal-950/20 dark:text-teal-400 dark:hover:bg-teal-950/40"
        >
          Search by accords
        </Link>
      </div>
    </section>
  );
};
