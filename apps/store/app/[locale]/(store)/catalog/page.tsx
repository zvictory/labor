import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { ProductCard } from '@/components/catalog/product-card';
import { listProducts, PAGE_SIZE, type ProductSort } from '@/lib/catalog/products';
import { getNotes } from '@/lib/catalog/notes';
import { getBrands } from '@/lib/catalog/brands';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Lang = 'en' | 'ru' | 'uz';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

const SORTS: readonly ProductSort[] = ['new', 'popular', 'price_asc', 'price_desc'];
const isSort = (v: string | undefined): v is ProductSort =>
  v !== undefined && (SORTS as readonly string[]).includes(v);

// Only these two are offered as controls. Every decant in the catalogue is
// priced from the same per-ml bench rate, so `price_asc` / `price_desc` sort
// 541 identical numbers and the grid does not visibly move — a control that
// does nothing teaches the visitor the filters are broken. The sort itself is
// untouched: `?sort=price_asc` still parses and still orders, so a bookmarked
// link keeps working and restoring the buttons is a one-line change once the
// catalogue carries more than one price.
const SHOWN_SORTS: readonly ProductSort[] = ['new', 'popular'];

// Sort option labels, per locale (component-local copy).
const SORT_COPY: Record<Lang, Record<ProductSort, string>> = {
  ru: { new: 'Новинки', popular: 'Популярные', price_asc: 'Дешевле', price_desc: 'Дороже' },
  en: { new: 'Newest', popular: 'Popular', price_asc: 'Price ↑', price_desc: 'Price ↓' },
  uz: { new: 'Yangi', popular: 'Ommabop', price_asc: 'Arzon', price_desc: 'Qimmat' },
};

const FILTERS_COPY: Record<Lang, { notes: string; brands: string; all: string; clear: string }> = {
  ru: { notes: 'Ноты', brands: 'Бренды', all: 'Все', clear: 'Сбросить' },
  en: { notes: 'Notes', brands: 'Brands', all: 'All', clear: 'Clear' },
  uz: { notes: 'Notalar', brands: 'Brendlar', all: 'Barchasi', clear: 'Tozalash' },
};

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

// Build a /catalog href that preserves the current filter set, overriding the
// given keys. `null` removes a key.
const buildHref = (
  locale: string,
  current: Record<string, string | undefined>,
  overrides: Record<string, string | null>,
): string => {
  const sp = new URLSearchParams();
  const merged = { ...current, ...overrides };
  for (const [k, val] of Object.entries(merged)) {
    if (val) sp.set(k, val);
  }
  const qs = sp.toString();
  return `/${locale}/catalog${qs ? `?${qs}` : ''}`;
};

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const lang = toLang(locale);

  const t = await getTranslations('catalog');

  const note = first(sp.note);
  const brand = first(sp.brand);
  const family = first(sp.family);
  const gender = first(sp.gender);
  const perfumer = first(sp.perfumer);
  const q = first(sp.q);
  const sortParam = first(sp.sort);
  const sort: ProductSort = isSort(sortParam) ? sortParam : 'new';
  const pageRaw = Number(first(sp.page));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  // Active filter snapshot, reused to build links.
  const active: Record<string, string | undefined> = {
    note,
    brand,
    family,
    gender,
    perfumer,
    q,
    sort: sort === 'new' ? undefined : sort,
  };

  const [result, notes, brands] = await Promise.all([
    listProducts({ locale, sort, brand, note, family, gender, perfumer, q, page }),
    getNotes(locale, { take: 12 }),
    getBrands(locale, { take: 12 }),
  ]);

  const { data, meta } = result;
  const blocks = chunk(data, BLOCK_SIZE);
  const fc = FILTERS_COPY[lang];
  const topNotes = notes.slice(0, 12);
  const topBrands = brands.slice(0, 12);
  const hasActiveFilter = Boolean(note || brand || family || gender || q);

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-ink dark:text-bone text-4xl md:text-5xl">
            {t('title')}
          </h1>
          {/* The result count is a measured value, not prose: mono and
              tabular, like every other number on the page. */}
          <p className="text-muted-foreground text-label font-mono tracking-[0.16em] uppercase">
            {t('foundCount', { count: meta.total })}
          </p>
        </div>

        {/* Sort — links (server-friendly, no client state) */}
        <div className="flex flex-wrap items-center gap-2">
          {SHOWN_SORTS.map((s) => {
            const isActive = s === sort;
            return (
              <Link
                key={s}
                href={buildHref(locale, active, { sort: s === 'new' ? null : s, page: null })}
                className={`border px-3 py-1.5 text-xs tracking-wider uppercase transition-colors ${
                  isActive
                    ? 'border-brass bg-brass text-bone'
                    : 'border-border text-ink-muted hover:border-foreground hover:text-foreground dark:text-stone-400'
                }`}
              >
                {SORT_COPY[lang][s]}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Filter rails */}
      <div className="border-border mb-10 space-y-4 border-b pb-8">
        <FilterRow
          label={fc.notes}
          allLabel={fc.all}
          allActive={!note}
          allHref={buildHref(locale, active, { note: null, page: null })}
          items={topNotes.map((n) => ({
            key: n.slug,
            label: n.name,
            active: n.slug === note,
            href: buildHref(locale, active, { note: n.slug, page: null }),
          }))}
        />
        <FilterRow
          label={fc.brands}
          allLabel={fc.all}
          allActive={!brand}
          allHref={buildHref(locale, active, { brand: null, page: null })}
          items={topBrands.map((br) => ({
            key: br.slug,
            label: br.name,
            active: br.slug === brand,
            href: buildHref(locale, active, { brand: br.slug, page: null }),
          }))}
        />
        {hasActiveFilter && (
          <Link
            href={`/${locale}/catalog${sort === 'new' ? '' : `?sort=${sort}`}`}
            className="text-brass inline-block text-xs tracking-wider uppercase hover:underline"
          >
            {fc.clear}
          </Link>
        )}
      </div>

      {/* Results, in blocks of twelve.
          The island carries 84 testers in seven blocks of twelve with a gap
          between them; a flat run of 24 identical cards is the one thing the
          shelf never does. The rule and the mono marker put that rhythm on
          screen, and they double as a position: a customer three screens down
          can see where they are in 541. */}
      {data.length > 0 ? (
        <div className="flex flex-col gap-10">
          {blocks.map((block, i) => {
            const first = (page - 1) * PAGE_SIZE + i * BLOCK_SIZE + 1;
            return (
              <div key={first} className="flex flex-col gap-4">
                <div className="border-border text-muted-foreground text-micro flex items-baseline justify-between border-t pt-3 font-mono tracking-[0.16em] uppercase tabular-nums">
                  <span>Block {pad(Math.ceil(first / BLOCK_SIZE))}</span>
                  <span>
                    {pad(first)}–{pad(first + block.length - 1)} / {meta.total}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                  {block.map((product) => (
                    <ProductCard key={product.id} product={product} locale={locale} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-ink-muted py-20 text-center text-sm dark:text-stone-400">{t('empty')}</p>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={buildHref(locale, active, { page: String(page - 1) })}
              className="border-border hover:border-foreground border px-4 py-2 text-xs tracking-wider uppercase hover:underline hover:underline-offset-4"
            >
              {t('prev')}
            </Link>
          ) : (
            <span className="border-border/50 text-ink-muted/50 border px-4 py-2 text-xs tracking-wider uppercase">
              {t('prev')}
            </span>
          )}
          <span className="text-ink-muted text-xs tracking-wider uppercase dark:text-stone-400">
            {t('pageOf', { page, total: meta.totalPages })}
          </span>
          {page < meta.totalPages ? (
            <Link
              href={buildHref(locale, active, { page: String(page + 1) })}
              className="border-border hover:border-foreground border px-4 py-2 text-xs tracking-wider uppercase hover:underline hover:underline-offset-4"
            >
              {t('next')}
            </Link>
          ) : (
            <span className="border-border/50 text-ink-muted/50 border px-4 py-2 text-xs tracking-wider uppercase">
              {t('next')}
            </span>
          )}
        </nav>
      )}
    </div>
  );
}

function FilterRow({
  label,
  allLabel,
  allActive,
  allHref,
  items,
}: {
  label: string;
  allLabel: string;
  allActive: boolean;
  allHref: string;
  items: { key: string; label: string; active: boolean; href: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-ink-muted text-micro mr-1 w-16 shrink-0 font-bold tracking-[0.2em] uppercase dark:text-stone-400">
        {label}
      </span>
      <Pill label={allLabel} active={allActive} href={allHref} />
      {items.map((it) => (
        <Pill key={it.key} label={it.label} active={it.active} href={it.href} />
      ))}
    </div>
  );
}

// Twelve is the shelf block. Numbers are zero-padded so the markers form a
// column down the page instead of jittering as the count crosses 100.
const BLOCK_SIZE = 12;
const pad = (n: number): string => String(n).padStart(3, '0');

const chunk = <T,>(rows: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(rows.length / size) }, (_, i) =>
    rows.slice(i * size, (i + 1) * size),
  );

function Pill({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`text-label border px-3 py-1 font-mono tracking-[0.08em] transition-colors ${
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}
