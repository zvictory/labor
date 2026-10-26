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
const CREAM = '#f4efe7';
const INK = '#1b1712';

/** `color` blended toward `base`, as CSS: accord colours are loud at full strength. */
const mix = (color: string, pct: number, base: string = CREAM): string =>
  `color-mix(in oklab, ${color} ${pct}%, ${base})`;

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
      {/* Hero: cream, with a halo of the perfume's own colour behind the
          bottle, its name written large and faint, the bottle floating over
          a soft floor shadow. */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `radial-gradient(60% 70% at 72% 42%, ${mix(moodA, 38)} 0%, ${mix(moodB, 14)} 45%, ${CREAM} 75%)`,
        }}
      >
        <div className="relative container grid items-center gap-6 pt-8 pb-10 md:grid-cols-[1fr_1fr] md:gap-12 md:py-24">
          {/* The name, set vertically along the right edge so it never sits
              behind the copy; the bottle column paints over it. */}
          <p
            aria-hidden
            className="font-display pointer-events-none absolute top-1/2 right-0 hidden -translate-y-1/2 rotate-180 text-[9rem] leading-none font-semibold tracking-[-0.04em] whitespace-nowrap select-none [writing-mode:vertical-rl] md:block lg:text-[11rem]"
            style={{ color: mix(moodA, 30, 'transparent') }}
          >
            {product.name}
          </p>
          <div className="order-2 space-y-6 md:order-1">
            <p className={`${eyebrowCls} text-ink-muted`}>
              {product.brand}
              {meta ? ` · ${meta}` : ''}
            </p>
            <h1 className="font-display text-ink text-6xl leading-[0.9] tracking-[-0.04em] md:text-8xl">
              {product.name}
            </h1>
            {story && (
              <p className="text-ink/90 max-w-md font-serif text-xl leading-snug italic md:text-2xl">
                {resolveLocaleText(story.hook, locale)}
              </p>
            )}
            <span
              aria-hidden
              className="block h-px w-16"
              style={{ background: mix(moodA, 70, INK) }}
            />
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

          <div className="relative order-1 mx-auto w-full max-w-[15rem] md:order-2 md:max-w-sm">
            <div className="relative aspect-[3/4] w-full motion-safe:[animation:story-float_7s_ease-in-out_infinite]">
              {image && (
                <Image
                  src={image}
                  alt={`${product.brand} ${product.name}`}
                  fill
                  priority
                  sizes="(min-width: 768px) 24rem, 15rem"
                  className="object-contain"
                />
              )}
            </div>
            {/* The floor the bottle stands over. */}
            <span
              aria-hidden
              className="mx-auto -mt-2 block h-5 w-2/3 rounded-[50%] blur-md"
              style={{ background: 'rgba(40,30,20,0.22)' }}
            />
          </div>
        </div>

        {/* The accords, softened to the page's cream, with their share. */}
        {accords.length > 0 && accordTotal > 0 && (
          <div className="relative container pb-12">
            <p className={`${eyebrowCls} text-ink-muted mb-4`}>{c.accords}</p>
            <div className="flex h-1.5 w-full gap-1">
              {accords.map((a) => (
                <span
                  key={a.name}
                  title={a.name}
                  style={{
                    width: `${(a.weight / accordTotal) * 100}%`,
                    background: mix(HEX.test(a.color_hex) ? a.color_hex : '#c8bba8', 75, INK),
                  }}
                />
              ))}
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {accords.map((a) => (
                <li
                  key={a.name}
                  className="text-ink px-3 py-1 text-xs"
                  style={{ background: mix(HEX.test(a.color_hex) ? a.color_hex : '#c8bba8', 22) }}
                >
                  {a.name}
                  <span className="text-ink-muted ml-1.5 font-mono tabular-nums">
                    {Math.round((a.weight / accordTotal) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* The story in our words: a drop cap, a rule, then the quieter second voice. */}
      {story && story.chapters.length > 0 && (
        <section className="container max-w-2xl space-y-8 py-20 md:py-28">
          <span
            aria-hidden
            className="block h-px w-16"
            style={{ background: mix(moodA, 70, INK) }}
          />
          {story.chapters.map((ch, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? 'text-ink font-serif text-2xl leading-[1.45] md:text-[1.85rem] first-letter:float-left first-letter:mt-1 first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:leading-[0.8]'
                  : 'text-ink-muted text-lg leading-relaxed'
              }
            >
              {resolveLocaleText(ch, locale)}
            </p>
          ))}
        </section>
      )}

      {/* Top, heart and base as three moments of the day on the skin, on one line. */}
      {hasJourney && (
        <section style={{ background: mix(moodA, 12) }}>
          <div className="container space-y-12 py-20 md:py-28">
            <header className="max-w-2xl space-y-3">
              <h2 className={`${h2Cls} text-ink`}>{c.journey}</h2>
              <p className="text-ink-muted text-base">{c.journeyLead}</p>
            </header>
            <ol className="relative grid gap-12 md:grid-cols-3 md:gap-8">
              <span
                aria-hidden
                className="absolute top-[7px] right-0 left-0 hidden h-px md:block"
                style={{ background: mix(moodA, 60, INK) }}
              />
              {stages.map((stage, i) =>
                stage.notes.length === 0 ? null : (
                  <li key={c.stages[i]} className="relative space-y-5">
                    <span
                      aria-hidden
                      className="relative block size-[15px] border-2"
                      style={{ background: CREAM, borderColor: mix(moodA, 60, INK) }}
                    />
                    <div>
                      <p className={`${eyebrowCls} text-ink-muted`}>{c.stageTimes[i]}</p>
                      <h3 className="font-display text-ink mt-1 text-3xl tracking-[-0.02em]">
                        {c.stages[i]}
                      </h3>
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
                    <span className="bg-ink/10 h-2 overflow-hidden">
                      <span
                        className="block h-full"
                        style={{ width: `${row.value}%`, background: mix(moodA, 60, INK) }}
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
                          className="h-2 flex-1"
                          style={{
                            background:
                              i < Math.round(Number(value))
                                ? mix(moodA, 60, INK)
                                : 'rgba(0,0,0,0.08)',
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
