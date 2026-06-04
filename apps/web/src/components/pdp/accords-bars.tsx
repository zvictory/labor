import { useTranslations } from 'next-intl';
import type { FragranceAccord } from '@/lib/api/products';
import { getReadableTextColor } from '@/lib/color-contrast';

interface Props {
  accords: FragranceAccord[];
}

export const AccordsBars = ({ accords }: Props) => {
  const t = useTranslations('pdp.accords');
  const sorted = [...accords].sort((a, b) => b.weight - a.weight).slice(0, 8);
  if (sorted.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="accords-heading">
      <h2 id="accords-heading" className="font-serif text-2xl tracking-tight">
        {t('title')}
      </h2>
      <ul className="space-y-1.5">
        {sorted.map((a) => {
          const width = Math.max(12, Math.min(100, a.weight));
          const bg = a.color_hex || '#cbd5e1';
          return (
            <li key={a.id}>
              <div
                className="flex h-8 items-center justify-center rounded-r-md px-3 text-sm font-medium capitalize transition-[width] duration-500 ease-out"
                style={{ width: `${width}%`, backgroundColor: bg, color: getReadableTextColor(bg) }}
                aria-label={`${a.name}: ${a.weight}%`}
              >
                {a.name}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
