import { useTranslations } from 'next-intl';
import type { FragranceNote } from '@/lib/api/products';
import Link from 'next/link';
import Image from 'next/image';

interface Props {
  notes: FragranceNote[];
  locale: string;
}

type Layer = 'top' | 'heart' | 'base';
const TILE_PX = 64;
const LAYERS: Layer[] = ['top', 'heart', 'base'];

export const NotesPyramid = ({ notes, locale }: Props) => {
  const t = useTranslations('pdp.pyramid');
  const grouped: Record<Layer, FragranceNote[]> = { top: [], heart: [], base: [] };
  for (const n of notes) grouped[n.layer].push(n);

  return (
    <section className="space-y-5" aria-labelledby="pyramid-heading">
      <h2 id="pyramid-heading" className="font-serif text-2xl tracking-tight">{t('title')}</h2>
      <div className="grid grid-cols-3 gap-6">
        {LAYERS.map((key) => {
          const group = grouped[key];
          return (
            <div key={key}>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-stone-500">{t(key)}</p>
              {group.length === 0 ? (
                <p className="text-xs text-stone-400">—</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {group.map((n) => {
                    const slug = n.slug || n.name.toLowerCase().replace(/\s+/g, '-');
                    return (
                      <li key={n.id} className="flex items-center gap-3">
                        <Link
                          href={`/${locale}/catalog?note=${slug}`}
                          className="group flex items-center gap-3"
                          aria-label={n.name}
                        >
                          <div
                            className="relative shrink-0 overflow-hidden rounded-xl border border-stone-200/60 bg-stone-50 shadow-sm transition group-hover:shadow-md group-hover:scale-[1.03]"
                            style={{ width: TILE_PX, height: TILE_PX }}
                          >
                            {n.icon_url ? (
                              <Image
                                src={n.icon_url}
                                alt={n.name}
                                fill
                                sizes={`${TILE_PX}px`}
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center text-sm uppercase tracking-tight text-stone-400">
                                {n.name.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-stone-700 leading-tight">{n.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
