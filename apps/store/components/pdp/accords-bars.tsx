import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ProductAccordDTO } from '@/lib/catalog/types';
import { getReadableTextColor } from '@/components/catalog/color-contrast';

interface Props {
  accords: ProductAccordDTO[];
  locale: string;
}

export const AccordsBars = ({ accords, locale }: Props) => {
  const t = useTranslations('pdp.accords');
  const sorted = [...accords].sort((a, b) => b.weight - a.weight).slice(0, 10);
  if (sorted.length === 0) return null;

  return (
    <section className="flex flex-col items-center space-y-4" aria-labelledby="accords-heading">
      <h2
        id="accords-heading"
        className="text-muted-foreground text-center font-sans text-lg font-semibold tracking-wide"
      >
        main accords
      </h2>
      <ul className="w-full max-w-[320px] space-y-1.5">
        {sorted.map((a) => {
          const width = Math.max(20, Math.min(100, a.weight));
          const bg = a.color_hex || '#cbd5e1';
          return (
            <li key={a.name} className="w-full">
              <Link
                href={a.slug ? `/${locale}/catalog?accord=${a.slug}` : `/${locale}/catalog`}
                className="text-label flex h-7 w-full items-center justify-center px-3 font-medium tracking-wide lowercase shadow-xs transition-all duration-300 hover:scale-[1.01] hover:brightness-105"
                style={{
                  width: `${width}%`,
                  backgroundColor: bg,
                  color: getReadableTextColor(bg),
                }}
                aria-label={`${a.name}: ${a.weight}%`}
              >
                <span className="truncate">{a.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="pt-2">
        <Link
          href={`/${locale}/notes`}
          className="border-border hover:border-foreground text-micro inline-flex h-9 items-center justify-center border px-6 font-mono tracking-[0.16em] uppercase transition-colors"
        >
          Search by accords
        </Link>
      </div>
    </section>
  );
};
