import { useTranslations } from 'next-intl';
import type { NotePyramidDTO } from '@/lib/catalog/types';
import Link from 'next/link';
import Image from 'next/image';

interface Props {
  notes: NotePyramidDTO;
  locale: string;
}

type Layer = 'top' | 'middle' | 'base';
const TILE_PX = 64;
const LAYERS: { key: Layer; langKey: string }[] = [
  { key: 'top', langKey: 'top' },
  { key: 'middle', langKey: 'heart' },
  { key: 'base', langKey: 'base' },
];

export const NotesPyramid = ({ notes, locale }: Props) => {
  const t = useTranslations('pdp.pyramid');

  return (
    <section className="space-y-5" aria-labelledby="pyramid-heading">
      <h2 id="pyramid-heading" className="font-serif text-2xl tracking-tight">
        {t('title')}
      </h2>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
        {LAYERS.map(({ key, langKey }) => {
          const group = notes[key];
          return (
            <div key={key}>
              <p className="text-muted-foreground mb-3 text-xs font-medium tracking-[0.18em] uppercase">
                {t(langKey)}
              </p>
              {group.length === 0 ? (
                <p className="text-muted-foreground text-xs">—</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:flex md:flex-col md:gap-3">
                  {group.map((n) => {
                    const slug = n.slug || n.name.toLowerCase().replace(/\s+/g, '-');
                    return (
                      <li key={n.slug} className="flex items-center gap-3">
                        <Link
                          href={`/${locale}/catalog?note=${slug}`}
                          className="group flex w-full items-center gap-3"
                          aria-label={n.name}
                        >
                          <div
                            className="relative shrink-0 overflow-hidden border border-stone-200/60 shadow-sm transition group-hover:scale-[1.03] group-hover:shadow-md"
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
                              <span className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm tracking-tight uppercase">
                                {n.name.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground group-hover:text-brass truncate text-xs leading-tight font-medium transition-colors">
                            {n.name}
                          </span>
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
