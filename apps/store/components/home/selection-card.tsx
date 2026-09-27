import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { ProductCardDTO } from '@/lib/catalog/types';
import { formatUzs } from '@/lib/money';
import { TickScale, toTicks } from '@/components/catalog/tick-scale';

// The home page's card. Where the catalogue card answers "which one is it"
// (rating, votes), this one answers "what is it like": three notes and how long
// it lasts, then the price — sized so two sit side by side on a 390 px phone.
// The whole card is one link; buying happens on the product page or the hero.
export const SelectionCard = ({ product, locale }: { product: ProductCardDTO; locale: string }) => {
  const t = useTranslations('product');

  return (
    <Link
      href={`/${locale}/product/${product.slug}`}
      className="border-hairline hover:border-graphite dark:border-gunmetal dark:hover:border-offwhite flex flex-col border transition-colors duration-200"
    >
      <div className="border-hairline dark:border-gunmetal relative flex h-[120px] items-center justify-center border-b md:h-48">
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            fill
            sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
            className="object-contain p-3 mix-blend-multiply dark:mix-blend-normal"
          />
        ) : (
          <span className="text-muted-foreground text-micro font-mono tracking-[0.16em] uppercase">
            {product.brand}
          </span>
        )}
      </div>

      <div className="flex flex-grow flex-col gap-1.5 p-[11px]">
        <p className="text-muted-foreground text-micro font-mono tracking-[0.06em] uppercase">
          {product.brand}
        </p>
        <p className="text-sm leading-[18px] font-semibold tracking-[-0.01em]">{product.name}</p>
        {product.notes.length > 0 && (
          <p className="text-muted-foreground text-label font-mono">{product.notes.join(' · ')}</p>
        )}
        {product.avg_longevity > 0 && (
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-muted-foreground text-micro font-mono tracking-[0.16em] uppercase">
              {t('longevity')}
            </span>
            <TickScale
              value={toTicks(product.avg_longevity, 10)}
              size="sm"
              label={t('longevity')}
            />
          </div>
        )}
        <div className="border-hairline dark:border-gunmetal mt-auto flex justify-between gap-2 border-t pt-[7px] font-mono text-xs font-medium tabular-nums">
          <span className="text-muted-foreground uppercase">
            {product.volume_ml ? t('volumeShort', { ml: product.volume_ml }) : null}
          </span>
          <span className="whitespace-nowrap">{formatUzs(product.price, locale)}</span>
        </div>
      </div>
    </Link>
  );
};
