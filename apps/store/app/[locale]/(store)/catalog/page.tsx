import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { ProductCard } from '@/components/catalog/product-card';
import { listProducts, type ProductSort } from '@/lib/catalog/products';
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
    q,
    sort: sort === 'new' ? undefined : sort,
  };

  const [result, notes, brands] = await Promise.all([
    listProducts({ locale, sort, brand, note, family, gender, q, page }),
    getNotes(locale),
    getBrands(locale),
  ]);

  const { data, meta } = result;
  const fc = FILTERS_COPY[lang];
  const topNotes = notes.slice(0, 12);
  const topBrands = brands.slice(0, 12);
  const hasActiveFilter = Boolean(note || brand || family || gender || q);

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">{t('title')}</h1>
          <p className="text-sm text-ink-muted dark:text-stone-400">
            {t('foundCount', { count: meta.total })}
          </p>
        </div>

        {/* Sort — links (server-friendly, no client state) */}
        <div className="flex flex-wrap items-center gap-2">
          {SORTS.map((s) => {
            const isActive = s === sort;
            return (
              <Link
                key={s}
                href={buildHref(locale, active, { sort: s === 'new' ? null : s, page: null })}
                className={`border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'border-brass bg-brass text-bone'
                    : 'border-border text-ink-muted hover:border-brass/60 hover:text-brass dark:text-stone-400'
                }`}
              >
                {SORT_COPY[lang][s]}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Filter rails */}
      <div className="mb-10 space-y-4 border-b border-border pb-8">
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
            className="inline-block text-xs uppercase tracking-wider text-brass hover:underline"
          >
            {fc.clear}
          </Link>
        )}
      </div>

      {/* Results */}
      {data.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {data.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="py-20 text-center text-sm text-ink-muted dark:text-stone-400">{t('empty')}</p>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={buildHref(locale, active, { page: String(page - 1) })}
              className="border border-border px-4 py-2 text-xs uppercase tracking-wider hover:border-brass/60 hover:text-brass"
            >
              {t('prev')}
            </Link>
          ) : (
            <span className="border border-border/50 px-4 py-2 text-xs uppercase tracking-wider text-ink-muted/50">
              {t('prev')}
            </span>
          )}
          <span className="text-xs uppercase tracking-wider text-ink-muted dark:text-stone-400">
            {t('pageOf', { page, total: meta.totalPages })}
          </span>
          {page < meta.totalPages ? (
            <Link
              href={buildHref(locale, active, { page: String(page + 1) })}
              className="border border-border px-4 py-2 text-xs uppercase tracking-wider hover:border-brass/60 hover:text-brass"
            >
              {t('next')}
            </Link>
          ) : (
            <span className="border border-border/50 px-4 py-2 text-xs uppercase tracking-wider text-ink-muted/50">
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
      <span className="mr-1 w-16 shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted dark:text-stone-400">
        {label}
      </span>
      <Pill label={allLabel} active={allActive} href={allHref} />
      {items.map((it) => (
        <Pill key={it.key} label={it.label} active={it.active} href={it.href} />
      ))}
    </div>
  );
}

function Pill({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? 'border-brass bg-brass/10 text-brass'
          : 'border-border text-ink-muted hover:border-brass/60 hover:text-brass dark:text-stone-400'
      }`}
    >
      {label}
    </Link>
  );
}
