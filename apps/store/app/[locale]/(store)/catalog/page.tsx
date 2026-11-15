import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { CatalogFilters, type FilterGroup } from '@/components/catalog/catalog-filters';
import { catalogHref as buildHref } from '@/components/catalog/filter-query';
import { ProductCard } from '@/components/catalog/product-card';
import { listProducts, PAGE_SIZE, type ProductSort } from '@/lib/catalog/products';
import { getNotes } from '@/lib/catalog/notes';
import { getBrands } from '@/lib/catalog/brands';
import { FAMILY_FILTERS, FAMILY_LABELS } from '@/lib/catalog/note-families';
import type { Gender } from '@/lib/catalog/types';
import { pageMetadata } from '@/lib/seo';

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

const FILTERS_COPY: Record<
  Lang,
  {
    notes: string;
    brands: string;
    families: string;
    genders: string;
    all: string;
    clear: string;
    sort: string;
    allBrands: string;
    allNotes: string;
  }
> = {
  ru: {
    notes: 'Ноты',
    brands: 'Бренды',
    families: 'Семейство',
    genders: 'Для кого',
    all: 'Все',
    clear: 'Сбросить',
    sort: 'Сортировка',
    allBrands: 'Все бренды',
    allNotes: 'Все ноты',
  },
  en: {
    notes: 'Notes',
    brands: 'Brands',
    families: 'Family',
    genders: 'For',
    all: 'All',
    clear: 'Clear',
    sort: 'Sort',
    allBrands: 'All brands',
    allNotes: 'All notes',
  },
  uz: {
    notes: 'Notalar',
    brands: 'Brendlar',
    families: 'Oila',
    genders: 'Kim uchun',
    all: 'Barchasi',
    clear: 'Tozalash',
    sort: 'Saralash',
    allBrands: 'Barcha brendlar',
    allNotes: 'Barcha notalar',
  },
};

// The olfactive families and the gender rails. `family` and `gender` have been
// parsed and passed to listProducts since the catalogue was written, but no
// control ever set them — the Brandbook rebuild replaced the mobile drawer that
// carried them with the server-rendered rails and did not bring these two over.
// So a visitor could only narrow 541 fragrances by note or brand. The family
// labels live beside the families in lib/catalog/note-families.

// Ordered by how much of the shop each covers: 436 unisex, 53 women, 52 men.
const GENDER_FILTERS: readonly Gender[] = ['unisex', 'women', 'men'];

const GENDER_COPY: Record<Lang, Record<Gender, string>> = {
  ru: { unisex: 'Унисекс', women: 'Женские', men: 'Мужские' },
  en: { unisex: 'Unisex', women: 'Women', men: 'Men' },
  uz: { unisex: 'Uniseks', women: 'Ayollar', men: 'Erkaklar' },
};

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

// Filters that define what the page is about stay in the canonical URL, so a
// brand's or a note's listing can rank on its own. Paging and sort orders do
// not: they are the same listing, reshuffled.
const CANONICAL_FILTERS = ['brand', 'note', 'family', 'gender', 'perfumer'] as const;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'catalog' });
  const tb = await getTranslations({ locale, namespace: 'brand' });

  const qs = new URLSearchParams();
  for (const key of CANONICAL_FILTERS) {
    const value = first(sp[key]);
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  // A listing filtered to one brand and nothing else is that brand's page.
  const brandOnly = qs.size === 1 ? qs.get('brand') : null;

  return pageMetadata({
    locale,
    path: brandOnly
      ? `/brands/${encodeURIComponent(brandOnly)}`
      : `/catalog${query ? `?${query}` : ''}`,
    title: t('title'),
    description: tb('description'),
    // A free-text query is a search result, not a page.
    noindex: Boolean(first(sp.q)),
  });
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const lang = toLang(locale);

  const t = await getTranslations('catalog');
  const tc = await getTranslations('common');

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

  const active = { ...sp };

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
  const filterKeys = ['note', 'brand', 'family', 'gender', 'perfumer', 'q'];
  const clearHref = buildHref(
    locale,
    active,
    Object.fromEntries([...filterKeys, 'page'].map((key) => [key, null])),
  );
  const groups: FilterGroup[] = [
    {
      name: 'note',
      label: fc.notes,
      value: note,
      options: topNotes.map((n) => ({ value: n.slug, label: n.name })),
      moreHref: `/${locale}/notes`,
      moreLabel: fc.allNotes,
    },
    {
      name: 'brand',
      label: fc.brands,
      value: brand,
      options: topBrands.map((br) => ({ value: br.slug, label: br.name })),
      moreHref: `/${locale}/brands`,
      moreLabel: fc.allBrands,
    },
    {
      name: 'family',
      label: fc.families,
      value: family,
      options: FAMILY_FILTERS.map((f) => ({ value: f, label: FAMILY_LABELS[lang][f] })),
    },
    {
      name: 'gender',
      label: fc.genders,
      value: gender,
      options: GENDER_FILTERS.map((g) => ({ value: g, label: GENDER_COPY[lang][g] })),
    },
  ].map((group) =>
    group.value && !group.options.some((option) => option.value === group.value)
      ? { ...group, options: [{ value: group.value, label: group.value }, ...group.options] }
      : group,
  );
  const preserved = Object.entries(sp).flatMap(([key, value]) =>
    groups.some((group) => group.name === key) || key === 'page'
      ? []
      : (Array.isArray(value) ? value : value ? [value] : []).map((item): [string, string] => [
          key,
          item,
        ]),
  );
  const panelCopy = {
    ru: { filters: 'Фильтры', apply: 'Применить', cancel: 'Отмена' },
    en: { filters: 'Filters', apply: 'Apply', cancel: 'Cancel' },
    uz: { filters: 'Filtrlar', apply: 'Qo‘llash', cancel: 'Bekor qilish' },
  }[lang];

  return (
    <div className="container py-6 md:py-12">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
        <div className="space-y-1">
          <h1 className="page-title">{t('title')}</h1>
          {/* The result count is a measured value, not prose: mono and
              tabular, like every other number on the page. */}
          <p className="text-muted-foreground font-mono text-xs leading-4 tabular-nums">
            {t('foundCount', { count: meta.total })}
          </p>
        </div>

        {/* Sort — links (server-friendly, no client state). The group carries a
            name and the active link is marked, so the pair is announced as a
            sort control rather than as two loose links. */}
        <div role="group" aria-label={fc.sort} className="flex flex-wrap items-center gap-2">
          {SHOWN_SORTS.map((s) => {
            const isActive = s === sort;
            return (
              <Link
                key={s}
                href={buildHref(locale, active, { sort: s === 'new' ? null : s, page: null })}
                aria-current={isActive ? 'true' : undefined}
                className={`inline-flex min-h-11 items-center border px-3 py-1.5 text-xs tracking-wider uppercase transition-colors ${
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

      <CatalogFilters
        key={buildHref(locale, active, {})}
        action={`/${locale}/catalog`}
        groups={groups}
        preserved={preserved}
        clearHref={clearHref}
        copy={{ ...panelCopy, clear: fc.clear, all: fc.all }}
      />
      {filterKeys.some((key) => first(sp[key])) && (
        <div aria-label={panelCopy.filters} className="mb-5 flex flex-wrap gap-2">
          {filterKeys.map((key) => {
            const value = first(sp[key]);
            if (!value) return null;
            const group = groups.find((item) => item.name === key);
            const label = group?.options.find((option) => option.value === value)?.label ?? value;
            return (
              <Link
                key={key}
                href={buildHref(locale, active, { [key]: null, page: null })}
                aria-label={`${fc.clear}: ${group?.label ?? key} — ${label}`}
                className="border-border inline-flex min-h-11 items-center gap-3 border px-3 text-xs leading-4"
              >
                {label} <span aria-hidden="true">×</span>
              </Link>
            );
          })}
        </div>
      )}

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
                <div className="border-border text-muted-foreground flex items-baseline justify-between border-t pt-3 font-mono text-xs leading-4 tracking-[0.16em] uppercase tabular-nums">
                  <span>{tc('block', { n: pad(Math.ceil(first / BLOCK_SIZE)) })}</span>
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

// Twelve is the shelf block. Numbers are zero-padded so the markers form a
// column down the page instead of jittering as the count crosses 100.
const BLOCK_SIZE = 12;
const pad = (n: number): string => String(n).padStart(3, '0');

const chunk = <T,>(rows: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(rows.length / size) }, (_, i) =>
    rows.slice(i * size, (i + 1) * size),
  );
