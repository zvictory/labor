import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { AddToCart } from '@/components/cart/add-to-cart';
import { ProductCard } from '@/components/catalog/product-card';
import { NoteBead } from '@/components/catalog/olfactive-pyramid-view';
import { ProductReviews } from '@/components/reviews/product-reviews';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { getProduct } from '@/lib/catalog/products';
import { getProductStory } from '@/lib/catalog/stories';
import type { ProductNoteDTO } from '@/lib/catalog/types';
import { formatUzs, SAMPLE_ML } from '@/lib/money';
import { getProductReviews } from '@/lib/reviews/reviews';
import { pageMetadata } from '@/lib/seo';

// The story page of a perfume: the same catalogue record as the product page,
// told as a scroll instead of a label. Colour from its accords, the notes as a
// journey through the day on the skin, when people wear it, who made it, and
// the buy buttons always within reach. Works for any product; a hand-written
// story (lib/catalog/stories.ts) adds the hook and the chapters.

type Props = { params: Promise<{ locale: Locale; slug: string }> };
type Lang = 'ru' | 'uz' | 'en';
const toLang = (l: string): Lang => (l === 'uz' || l === 'en' ? l : 'ru');

const loadProduct = cache(getProduct);

const COPY: Record<
  Lang,
  {
    by: string;
    accords: string;
    journey: string;
    journeyLead: string;
    stages: [string, string, string];
    stageTimes: [string, string, string];
    wear: string;
    wearSource: (votes: number) => string;
    seasons: Record<'spring' | 'summer' | 'autumn' | 'winter', string>;
    times: Record<'day' | 'night', string>;
    longevity: string;
    sillage: string;
    perfumer: string;
    similar: string;
    toLabel: string;
  }
> = {
  uz: {
    by: 'Parfyumer',
    accords: 'Akkordlar',
    journey: 'Teridagi yoʻl',
    journeyLead:
      'Atir bir zumda emas, bosqichma-bosqich ochiladi. Vaqtlar taxminiy: teri va havoga qarab oʻzgaradi.',
    stages: ['Ochilish', 'Yurak', 'Iz'],
    stageTimes: ['ilk 15 daqiqa', 'keyingi 2–3 soat', 'kun oxirigacha'],
    wear: 'Qachon taqiladi',
    wearSource: (n) => `Fragrantica foydalanuvchilarining ${n} ta ovozi boʻyicha.`,
    seasons: { spring: 'Bahor', summer: 'Yoz', autumn: 'Kuz', winter: 'Qish' },
    times: { day: 'Kunduz', night: 'Kechqurun' },
    longevity: 'Saqlanishi',
    sillage: 'Shleyf',
    perfumer: 'Uni kim yaratgan',
    similar: 'Sizga yana yoqishi mumkin',
    toLabel: 'Toʻliq maʼlumot',
  },
  ru: {
    by: 'Парфюмер',
    accords: 'Аккорды',
    journey: 'Путь на коже',
    journeyLead:
      'Аромат раскрывается не сразу, а по стадиям. Время примерное: зависит от кожи и погоды.',
    stages: ['Начало', 'Сердце', 'Шлейф'],
    stageTimes: ['первые 15 минут', 'следующие 2–3 часа', 'до конца дня'],
    wear: 'Когда носить',
    wearSource: (n) => `По ${n} голосам пользователей Fragrantica.`,
    seasons: { spring: 'Весна', summer: 'Лето', autumn: 'Осень', winter: 'Зима' },
    times: { day: 'День', night: 'Вечер' },
    longevity: 'Стойкость',
    sillage: 'Шлейф',
    perfumer: 'Кто его создал',
    similar: 'Вам может понравиться',
    toLabel: 'Полная карточка',
  },
  en: {
    by: 'Perfumer',
    accords: 'Accords',
    journey: 'On the skin',
    journeyLead:
      'A perfume opens in stages, not all at once. Times are approximate: they shift with skin and weather.',
    stages: ['Opening', 'Heart', 'Trail'],
    stageTimes: ['first 15 minutes', 'the next 2–3 hours', 'to the end of the day'],
    wear: 'When to wear it',
    wearSource: (n) => `From ${n} votes by Fragrantica users.`,
    seasons: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
    times: { day: 'Day', night: 'Evening' },
    longevity: 'Longevity',
    sillage: 'Sillage',
    perfumer: 'Who made it',
    similar: 'You may also like',
    toLabel: 'Full product card',
  },
};

const HEX = /^#[0-9a-f]{6}$/i;

/** Two colours for the hero, from the strongest accords; a warm neutral without them. */
const moodColors = (accords: { color_hex: string; weight: number }[]): [string, string] => {
  const colors = [...accords]
    .sort((a, b) => b.weight - a.weight)
    .map((a) => a.color_hex)
    .filter((c) => HEX.test(c));
  return [colors[0] ?? '#d9cbb8', colors[1] ?? colors[0] ?? '#efe7dc'];
};

/** Breakdown entries with a value, in a fixed order; empty when the record has none. */
const bars = <K extends string>(
  data: Record<string, number>,
  keys: readonly K[],
): { key: K; value: number }[] => {
  const rows = keys.map((key) => ({ key, value: Math.max(0, Math.min(100, data[key] ?? 0)) }));
  return rows.some((r) => r.value > 0) ? rows : [];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await loadProduct(slug, locale);
  if (!product) return {};
  const story = getProductStory(product.slug);
  return pageMetadata({
    locale,
    path: `/product/${product.slug}/story`,
    title: product.brand ? `${product.name} — ${product.brand}` : product.name,
    description: story ? resolveLocaleText(story.hook, locale) : undefined,
    images: story?.image
      ? [story.image]
      : product.images.length > 0
        ? product.images.slice(0, 1)
        : [product.image],
  });
}

const eyebrowCls = 'text-label font-mono tracking-[0.2em] uppercase';
const h2Cls = 'font-display text-3xl tracking-[-0.02em] md:text-5xl';

export default async function ProductStoryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await loadProduct(slug, locale);
  if (!product) notFound();

  const lang = toLang(locale);
  const c = COPY[lang];
  const story = getProductStory(product.slug);
  const [moodA, moodB] = moodColors(product.accords);
  const accords = [...product.accords].sort((a, b) => b.weight - a.weight).slice(0, 6);
  const accordTotal = accords.reduce((s, a) => s + a.weight, 0);
  const seasons = bars(product.seasons, ['spring', 'summer', 'autumn', 'winter'] as const);
  const times = bars(product.time, ['day', 'night'] as const);
  const stages: { notes: ProductNoteDTO[] }[] = [
    { notes: product.notes.top },
    { notes: product.notes.middle },
    { notes: product.notes.base },
  ];
  const hasJourney = stages.some((s) => s.notes.length > 0);
  const image = story?.image ?? product.images[0] ?? product.image;
  const meta = [
    product.concentration,
    product.release_year,
    product.volume_ml ? `${product.volume_ml} ml` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const { reviews, summary } = await getProductReviews(product.id);
  const wearRows = [
    ...seasons.map((s) => ({ label: c.seasons[s.key], value: s.value })),
    ...times.map((t) => ({ label: c.times[t.key], value: t.value })),
  ];

  return (
    <div className="pb-28 lg:pb-8">
      {/* Hero: the perfume's own colours, from its two strongest accords. */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${moodA}55 0%, ${moodB}40 55%, #f4efe7 100%)`,
        }}
      >
        <div className="container grid items-center gap-8 py-10 md:grid-cols-[1.1fr_1fr] md:gap-16 md:py-20">
          <div className="order-2 space-y-5 md:order-1">
            <p className={`${eyebrowCls} text-ink-muted`}>
              {product.brand}
              {meta ? ` · ${meta}` : ''}
            </p>
            <h1 className="font-display text-ink text-5xl leading-[0.95] tracking-[-0.03em] md:text-7xl">
              {product.name}
            </h1>
            {story && (
              <p className="text-ink max-w-lg font-serif text-xl leading-snug md:text-2xl">
                {resolveLocaleText(story.hook, locale)}
              </p>
            )}
            {product.perfumers.length > 0 && (
              <p className="text-ink-muted text-sm">
                {c.by}:{' '}
                {product.perfumers.map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 && ', '}
                    <Link
                      href={`/${locale}/perfumers/${p.slug}`}
                      className="text-ink underline-offset-4 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            <div className="hidden max-w-md space-y-3 pt-2 lg:block">
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {formatUzs(product.price, locale)}
              </p>
              <AddToCart
                productId={product.id}
                locale={locale}
                hasSample
                volumeMl={product.volume_ml ?? null}
                sampleMl={SAMPLE_ML}
              />
              <WishlistButton productId={product.id} variant="full" />
            </div>
          </div>
          <div className="relative order-1 mx-auto aspect-square w-full max-w-[16rem] md:order-2 md:max-w-md">
            {image && (
              <Image
                src={image}
                alt={`${product.brand} ${product.name}`}
                fill
                priority
                sizes="(min-width: 768px) 28rem, 16rem"
                className="object-contain drop-shadow-[0_40px_40px_rgba(40,30,20,0.25)]"
              />
            )}
          </div>
        </div>

        {/* The accords as one band of colour, widths by weight. */}
        {accords.length > 0 && accordTotal > 0 && (
          <div className="container pb-10">
            <p className={`${eyebrowCls} text-ink-muted mb-3`}>{c.accords}</p>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {accords.map((a) => (
                <span
                  key={a.name}
                  title={a.name}
                  style={{
                    width: `${(a.weight / accordTotal) * 100}%`,
                    background: HEX.test(a.color_hex) ? a.color_hex : '#c8bba8',
                  }}
                />
              ))}
            </div>
            <ul className="text-ink-muted mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              {accords.map((a) => (
                <li key={a.name} className="flex items-center gap-1.5">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ background: HEX.test(a.color_hex) ? a.color_hex : '#c8bba8' }}
                  />
                  {a.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* The story in our words, when there is one. */}
      {story && story.chapters.length > 0 && (
        <section className="container max-w-3xl space-y-6 py-16 md:py-24">
          {story.chapters.map((ch, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? 'text-ink font-serif text-2xl leading-snug md:text-3xl'
                  : 'text-ink-muted text-lg leading-relaxed'
              }
            >
              {resolveLocaleText(ch, locale)}
            </p>
          ))}
        </section>
      )}

      {/* Top, heart and base as three moments of the day on the skin. */}
      {hasJourney && (
        <section className="bg-bone border-border border-y">
          <div className="container space-y-10 py-16 md:py-24">
            <header className="max-w-2xl space-y-3">
              <h2 className={`${h2Cls} text-ink`}>{c.journey}</h2>
              <p className="text-ink-muted text-base">{c.journeyLead}</p>
            </header>
            <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
              {stages.map((stage, i) =>
                stage.notes.length === 0 ? null : (
                  <li
                    key={c.stages[i]}
                    className="relative space-y-4 md:border-l md:border-[var(--color-border)] md:pl-6"
                  >
                    <div>
                      <p className={`${eyebrowCls} text-ink-muted`}>
                        0{i + 1} · {c.stageTimes[i]}
                      </p>
                      <h3 className="font-display text-ink mt-1 text-2xl">{c.stages[i]}</h3>
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-4">
                      {stage.notes.map((n) => (
                        <NoteBead key={n.slug} note={n} locale={locale} />
                      ))}
                    </div>
                  </li>
                ),
              )}
            </ol>
          </div>
        </section>
      )}

      {/* When people wear it, and how it lasts: imported votes, labelled as such. */}
      {(wearRows.length > 0 || product.avg_longevity > 0) && (
        <section className="container space-y-10 py-16 md:py-24">
          <header className="space-y-2">
            <h2 className={`${h2Cls} text-ink`}>{c.wear}</h2>
            {product.votes_count > 0 && (
              <p className="text-ink-muted text-xs">{c.wearSource(product.votes_count)}</p>
            )}
          </header>
          <div className="grid gap-10 md:grid-cols-3">
            {wearRows.length > 0 && (
              <ul className="space-y-3 md:col-span-2">
                {wearRows.map((row) => (
                  <li
                    key={row.label}
                    className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm"
                  >
                    <span className="text-ink">{row.label}</span>
                    <span className="bg-ink/10 h-2 overflow-hidden rounded-full">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${row.value}%`, background: moodA }}
                      />
                    </span>
                    <span className="text-ink-muted text-right font-mono text-xs tabular-nums">
                      {Math.round(row.value)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {product.avg_longevity > 0 && (
              <dl className="space-y-4 text-sm">
                {[
                  [c.longevity, product.avg_longevity],
                  [c.sillage, product.avg_sillage],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className="mt-1 flex gap-1" aria-label={`${Number(value).toFixed(1)} / 10`}>
                      {Array.from({ length: 10 }, (_, i) => (
                        <span
                          key={i}
                          className="h-2 flex-1 rounded-full"
                          style={{
                            background: i < Math.round(Number(value)) ? moodA : 'rgba(0,0,0,0.08)',
                          }}
                        />
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      )}

      <div className="container">
        <ProductReviews
          productId={product.id}
          slug={product.slug}
          locale={locale}
          summary={summary}
          reviews={reviews}
        />
      </div>

      {product.similar.length > 0 && (
        <section className="container space-y-8 py-16">
          <h2 className={`${h2Cls} text-ink`}>{c.similar}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {product.similar.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </section>
      )}

      <p className="container text-sm">
        <Link
          href={`/${locale}/product/${product.slug}`}
          className="text-ink underline underline-offset-4"
        >
          {c.toLabel} →
        </Link>
      </p>

      {/* Phones and tablets: the buy buttons ride along above the bottom navigation. */}
      <div className="border-border bg-background/95 fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t px-4 py-3 backdrop-blur md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="min-w-0">
            <p className="text-ink truncate text-sm font-medium">{product.name}</p>
            <p className="text-ink-muted font-mono text-xs tabular-nums">
              {formatUzs(product.price, locale)}
            </p>
          </div>
          <div className="ml-auto w-44 shrink-0">
            <AddToCart productId={product.id} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
