import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface SimilarItem { id: number; slug: string; name: string; brand: string; image: string }

export const SimilarCarousel = ({ items, locale }: { items: SimilarItem[]; locale: string }) => {
  const t = useTranslations('pdp.similar');
  if (items.length === 0) return null;
  return (
    <section className="space-y-3" aria-labelledby="similar-heading">
      <h2 id="similar-heading" className="font-serif text-2xl tracking-tight">{t('title')}</h2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:thin]">
        {items.map((i) => (
          <Link
            key={i.id}
            href={`/${locale}/product/${i.slug}`}
            className="w-40 shrink-0 snap-start space-y-2"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-50">
              <Image src={i.image} alt={i.name} fill sizes="160px" className="object-cover" />
            </div>
            <p className="text-xs uppercase tracking-widest text-stone-500">{i.brand}</p>
            <p className="text-sm leading-tight text-stone-900">{i.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
};
