import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { ProductDetailDTO } from '@/lib/catalog/types';
import { formatUzs } from '@/lib/money';
import { TELEGRAM_URL } from '@/lib/telegram';
import { AddToCart } from '@/components/cart/add-to-cart';
import { TickScale, toTicks } from '@/components/catalog/tick-scale';

// The home page opens on one bottle, and the first screen of a phone is enough
// to buy it: name, what it smells like, how long it lasts, the price and the
// button. The photo takes whatever height is left (never under 90 px) so the
// action stays above the fold from a 667 px phone up.

type Lang = 'en' | 'ru' | 'uz';

const COPY: Record<Lang, { decant: string; telegram: string; trust: string }> = {
  ru: {
    decant: 'Декант',
    telegram: 'Или закажите в Telegram',
    trust: 'Только оригинал · Доставка по Узбекистану · Оплата при получении или картой',
  },
  en: {
    decant: 'Decant',
    telegram: 'Or order on Telegram',
    trust: 'Authentic only · Delivery across Uzbekistan · Pay on delivery or by card',
  },
  uz: {
    decant: 'Dekant',
    telegram: 'Yoki Telegramda buyurtma bering',
    trust:
      'Faqat original · Oʻzbekiston boʻylab yetkazish · Qabul qilganda yoki karta bilan toʻlov',
  },
};

// One note per layer: how the scent opens, sits and dries down.
const arcOf = (notes: ProductDetailDTO['notes']): string[] =>
  [notes.top[0], notes.middle[0], notes.base[0]].flatMap((n) => (n ? [n.name] : []));

export function Hero({
  product,
  locale,
  lang,
}: {
  product: ProductDetailDTO;
  locale: string;
  lang: Lang;
}) {
  const t = useTranslations('product');
  const c = COPY[lang];
  const pdp = `/${locale}/product/${product.slug}`;
  const codeLine = [
    product.brand,
    product.volume_ml ? `${c.decant} ${t('volumeShort', { ml: product.volume_ml })}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const arc = arcOf(product.notes);

  return (
    <section className="border-border border-b">
      <div className="container flex h-[clamp(400px,calc(100svh-230px),500px)] flex-col gap-3 py-4 md:grid md:h-auto md:grid-cols-2 md:items-center md:gap-12 md:py-16">
        <Link href={pdp} className="relative min-h-[90px] flex-1 md:h-[480px] md:flex-none">
          {product.image && (
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(min-width:768px) 50vw, 100vw"
              className="object-contain mix-blend-multiply dark:mix-blend-normal"
            />
          )}
        </Link>

        <div className="flex shrink-0 flex-col gap-3 md:gap-8">
          <div className="flex flex-col gap-2">
            {codeLine && (
              <p className="text-muted-foreground text-micro font-mono tracking-[0.16em] uppercase">
                {codeLine}
              </p>
            )}
            <h1 className="text-[32px] leading-9 font-semibold tracking-[-0.025em] md:text-5xl md:leading-[1.05]">
              <Link href={pdp}>{product.name}</Link>
            </h1>
            {arc.length > 0 && (
              <p className="text-muted-foreground text-label font-mono">{arc.join(' · ')}</p>
            )}
            <div className="flex items-end justify-between gap-4 pt-0.5">
              <div className="flex gap-5">
                <Measure label={t('longevity')} ticks={toTicks(product.avg_longevity, 10)} />
                <Measure label={t('sillage')} ticks={toTicks(product.avg_sillage, 10)} />
              </div>
              <p className="font-mono text-[15px] leading-5 whitespace-nowrap tabular-nums">
                {formatUzs(product.price, locale)}
              </p>
            </div>
          </div>

          <div className="flex flex-col">
            <AddToCart productId={product.id} locale={locale} />
            <a
              href={TELEGRAM_URL}
              className="flex min-h-11 items-center justify-center font-mono text-xs underline underline-offset-4"
            >
              {c.telegram}
            </a>
            <p className="text-muted-foreground text-label text-center font-mono text-balance">
              {c.trust}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Measure({ label, ticks }: { label: string; ticks: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-micro font-mono leading-3 tracking-[0.16em] uppercase">
        {label}
      </span>
      <TickScale value={ticks} label={label} />
    </div>
  );
}
