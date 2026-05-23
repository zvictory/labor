import { useTranslations } from 'next-intl';
import type { FragranceAccord } from '@/lib/api/products';

interface Props {
  accords: FragranceAccord[];
}

const isLight = (hex: string): boolean => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const value = m[1];
  if (!value) return false;
  const n = parseInt(value, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return 0.299 * r + 0.587 * g + 0.114 * b > 180;
};

export const AccordsBars = ({ accords }: Props) => {
  const t = useTranslations('pdp.accords');
  const sorted = [...accords].sort((a, b) => b.weight - a.weight).slice(0, 8);
  if (sorted.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="accords-heading">
      <h2 id="accords-heading" className="font-serif text-2xl tracking-tight">{t('title')}</h2>
      <ul className="space-y-1.5">
        {sorted.map((a) => {
          const width = Math.max(12, Math.min(100, a.weight));
          const bg = a.color_hex || '#cbd5e1';
          const dark = !isLight(bg);
          return (
            <li key={a.id}>
              <div
                className="flex h-8 items-center justify-center rounded-r-md px-3 text-sm font-medium capitalize transition-[width] duration-500 ease-out"
                style={{ width: `${width}%`, backgroundColor: bg, color: dark ? '#ffffff' : '#1c1917' }}
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
