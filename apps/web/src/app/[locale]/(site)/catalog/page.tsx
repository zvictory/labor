import { setRequestLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { listProducts, type ProductCard as Card } from '@/lib/api/products';
import { getFilterFacets, type FilterFacets } from '@/lib/api/facets';
import { getPerfumer } from '@/lib/api/perfumers';
import { ProductCard } from '@/components/catalog/product-card';
import { FilterSelect, type FilterOption } from '@/components/catalog/filter-select';
import { FallbackImage } from '@/components/fallback-image';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    brand?: string;
    note?: string;
    perfumer?: string;
    family?: string;
    gender?: string;
    q?: string;
    sort?: string;
  }>;
}

type Lang = 'en' | 'ru' | 'uz';

const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz'] as const;

const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';

interface CatalogCopy {
  eyebrow: string;
  notes: string;
  brands: string;
  perfumers: string;
  families: string;
  genders: string;
  sort: string;
  all: string;
  activeTitle: string;
  clearAll: string;
  new: string;
  popular: string;
  price_asc: string;
  price_desc: string;
}

// Row titles, all/clear labels, and sort labels in 4 locales.
const COPY: Record<Lang, CatalogCopy> = {
  en: {
    eyebrow: 'EXCLUSIVE FRAGRANCES',
    notes: 'Notes',
    brands: 'Brands',
    perfumers: 'Perfumer',
    families: 'Categories',
    genders: 'Gender',
    sort: 'Sort',
    all: 'All',
    activeTitle: 'Active filters',
    clearAll: 'Clear all',
    new: 'Newest',
    popular: 'Popular',
    price_asc: 'Price · Low to High',
    price_desc: 'Price · High to Low',
  },
  ru: {
    eyebrow: 'СЕЛЕКТИВНЫЕ АРОМАТЫ',
    notes: 'Ноты',
    brands: 'Бренды',
    perfumers: 'Парфюмер',
    families: 'Категории',
    genders: 'Пол',
    sort: 'Сортировка',
    all: 'Все',
    activeTitle: 'Активные фильтры',
    clearAll: 'Сбросить все',
    new: 'Новинки',
    popular: 'Популярные',
    price_asc: 'Цена · по возрастанию',
    price_desc: 'Цена · по убыванию',
  },
  uz: {
    eyebrow: 'EKSKLYUZIV ATIRLAR',
    notes: 'Notalar',
    brands: 'Brendlar',
    perfumers: 'Parfyumer',
    families: 'Kategoriyalar',
    genders: 'Jins',
    sort: 'Saralash',
    all: 'Barchasi',
    activeTitle: 'Faol filtrlar',
    clearAll: 'Hammasini tozalash',
    new: 'Yangilari',
    popular: 'Mashhurlar',
    price_asc: 'Narx · arzondan',
    price_desc: 'Narx · qimmatdan',
  },
};

// Family slug → 4-locale display label. Covers every family the backend emits.
const FAMILY_LABELS: Record<string, Record<Lang, string>> = {
  woody:    { en: 'Woody',    ru: 'Древесные',  uz: 'Yogʻochli' },
  floral:   { en: 'Floral',   ru: 'Цветочные',  uz: 'Gulli' },
  citrus:   { en: 'Citrus',   ru: 'Цитрусовые', uz: 'Sitrus' },
  aromatic: { en: 'Aromatic', ru: 'Ароматные',  uz: 'Xushboʻy' },
  oriental: { en: 'Oriental', ru: 'Восточные',  uz: 'Sharqona' },
  green:    { en: 'Green',    ru: 'Зеленые',    uz: 'Yashil' },
  gourmand: { en: 'Gourmand', ru: 'Гурманские', uz: 'Shirinli' },
  smoky:    { en: 'Smoky',    ru: 'Дымные',     uz: 'Tutunli' },
  aquatic:  { en: 'Aquatic',  ru: 'Водные',     uz: 'Suvli' },
  leather:  { en: 'Leather',  ru: 'Кожаные',    uz: 'Charm' },
  chypre:   { en: 'Chypre',   ru: 'Шипровые',   uz: 'Shipr' },
  fougere:  { en: 'Fougère',  ru: 'Фужерные',   uz: 'Fujerli' },
};

// Gender values match the DB enum (men/women/unisex).
const GENDER_LABELS: Record<string, Record<Lang, string>> = {
  unisex: { en: 'Unisex', ru: 'Унисекс', uz: 'Uniseks' },
  men:    { en: 'Men',    ru: 'Мужские', uz: 'Erkaklar' },
  women:  { en: 'Women',  ru: 'Женские', uz: 'Ayollar' },
};

// "black-tea" → "Black Tea". Used when the API doesn't return a translated name.
const humanizeSlug = (slug: string): string =>
  slug
    .split('-')
    .map((s) => (s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)))
    .join(' ');

const familyLabel = (slug: string, lang: Lang): string =>
  FAMILY_LABELS[slug]?.[lang] ?? humanizeSlug(slug);

const genderLabel = (slug: string, lang: Lang): string =>
  GENDER_LABELS[slug]?.[lang] ?? humanizeSlug(slug);

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('catalog');

  const lang = toLang(locale);
  const copy = COPY[lang];

  const page = Number(sp.page ?? 1);
  const activeSort = sp.sort ?? 'popular';
  const activeNote = sp.note ?? '';
  const activeBrand = sp.brand ?? '';
  const activePerfumer = sp.perfumer ?? '';
  const activeFamily = sp.family ?? '';
  const activeGender = sp.gender ?? '';

  const preserveParams: Record<string, string | undefined> = {
    brand: sp.brand,
    note: sp.note,
    perfumer: sp.perfumer,
    family: sp.family,
    gender: sp.gender,
    q: sp.q,
    sort: sp.sort,
  };

  // Fetch products + facets in parallel. If either fails, fall back to empty
  // state — the page must still SSR even when the backend is offline.
  let data: Card[] = [];
  let meta = { total_count: 0, total_pages: 0 };
  let facets: FilterFacets = { brands: [], notes: [], families: [], genders: [] };

  const [productsRes, facetsRes] = await Promise.allSettled([
    listProducts({
      locale,
      page,
      brand: sp.brand,
      note: sp.note,
      perfumer: sp.perfumer,
      family: sp.family,
      gender: sp.gender,
      q: sp.q,
      sort: activeSort,
    }),
    getFilterFacets(locale),
  ]);

  if (productsRes.status === 'fulfilled') {
    data = productsRes.value.data;
    meta = productsRes.value.meta;
  }
  if (facetsRes.status === 'fulfilled') {
    facets = facetsRes.value.data;
  }

  // Build a URL that toggles/replaces a single filter without dropping the rest.
  const getLinkHref = (updates: Record<string, string | undefined>): string => {
    const next = new URLSearchParams();
    if (sp.brand) next.set('brand', sp.brand);
    if (sp.note) next.set('note', sp.note);
    if (sp.perfumer) next.set('perfumer', sp.perfumer);
    if (sp.family) next.set('family', sp.family);
    if (sp.gender) next.set('gender', sp.gender);
    if (sp.q) next.set('q', sp.q);
    if (sp.sort) next.set('sort', sp.sort);

    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) next.delete(k);
      else next.set(k, v);
    }
    next.delete('page');
    return `/${locale}/catalog?${next.toString()}`;
  };

  const noteLabel = (n: { slug: string; name: string | null }): string =>
    n.name ?? humanizeSlug(n.slug);

  const activeNoteFacet = activeNote
    ? facets.notes.find((n) => n.slug === activeNote) ?? null
    : null;

  let activePerfumerName = '';
  if (activePerfumer) {
    try {
      const res = await getPerfumer(activePerfumer, locale);
      activePerfumerName = res.data.name;
    } catch {
      activePerfumerName = humanizeSlug(activePerfumer);
    }
  }

  // Active-filter pills: only render when something is applied.
  const activePills: { key: string; label: string; clearHref: string }[] = [];
  if (activeBrand) {
    const b = facets.brands.find((x) => x.slug === activeBrand);
    activePills.push({
      key: `brand:${activeBrand}`,
      label: `${copy.brands}: ${b?.name ?? humanizeSlug(activeBrand)}`,
      clearHref: getLinkHref({ brand: undefined }),
    });
  }
  if (activeNote) {
    const n = facets.notes.find((x) => x.slug === activeNote);
    activePills.push({
      key: `note:${activeNote}`,
      label: `${copy.notes}: ${n ? noteLabel(n) : humanizeSlug(activeNote)}`,
      clearHref: getLinkHref({ note: undefined }),
    });
  }
  if (activePerfumer) {
    activePills.push({
      key: `perfumer:${activePerfumer}`,
      label: `${copy.perfumers}: ${activePerfumerName}`,
      clearHref: getLinkHref({ perfumer: undefined }),
    });
  }
  if (activeFamily) {
    activePills.push({
      key: `family:${activeFamily}`,
      label: `${copy.families}: ${familyLabel(activeFamily, lang)}`,
      clearHref: getLinkHref({ family: undefined }),
    });
  }
  if (activeGender) {
    activePills.push({
      key: `gender:${activeGender}`,
      label: `${copy.genders}: ${genderLabel(activeGender, lang)}`,
      clearHref: getLinkHref({ gender: undefined }),
    });
  }

  const clearAllHref = `/${locale}/catalog${sp.sort ? `?sort=${sp.sort}` : ''}`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <header className="space-y-1">
        <span className="text-[10px] uppercase tracking-[0.3em] text-brass font-bold">
          {copy.eyebrow}
        </span>
        <div className="flex items-baseline gap-3">
          <h1 className="font-sans font-bold text-3xl tracking-tight text-ink dark:text-bone">
            {t('title')}
          </h1>
          <p className="text-xs uppercase tracking-widest text-stone-400">
            {t('foundCount', { count: meta.total_count })}
          </p>
        </div>
      </header>

      {activeNoteFacet && (
        <section className="flex items-center gap-4 border-l-2 border-brass pl-4 py-2">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-1 ring-brass/30 shadow-sm">
            <FallbackImage
              src={activeNoteFacet.icon_url}
              alt=""
              aria-hidden
              fill
              sizes="56px"
              className="object-cover"
              fallback={
                <div className="h-full w-full rounded-full bg-brass/10 flex items-center justify-center border border-brass/30">
                  <span className="text-brass font-serif text-sm font-bold">
                    {activeNoteFacet.name ? activeNoteFacet.name.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
              }
            />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-brass">
              {copy.notes}
            </span>
            <h2 className="font-serif text-2xl text-ink dark:text-bone">
              {noteLabel(activeNoteFacet)}
            </h2>
          </div>
        </section>
      )}

      {/* Active-filter pill bar — only when filters are applied */}
      {activePills.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border border-brass/30 bg-brass/5 px-4 py-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-brass font-bold mr-2">
            {copy.activeTitle}:
          </span>
          {activePills.map((p) => (
            <Link
              key={p.key}
              href={p.clearHref}
              className="group inline-flex items-center gap-1.5 border border-brass/40 bg-bone/60 dark:bg-ink/60 px-3 py-1 text-[11px] uppercase tracking-widest text-ink dark:text-bone hover:border-brass hover:text-brass transition-colors"
              aria-label={`Remove ${p.label}`}
            >
              <span>{p.label}</span>
              <span aria-hidden className="text-stone-400 group-hover:text-brass">×</span>
            </Link>
          ))}
          <Link
            href={clearAllHref}
            className="ml-auto text-[10px] uppercase tracking-[0.2em] text-brass underline-offset-4 hover:underline font-bold"
          >
            {copy.clearAll}
          </Link>
        </div>
      )}

      {/* Filter panel — dropdowns that auto-navigate on change */}
      <div className="border-y border-border/80 py-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <FilterSelect
            label={copy.brands}
            paramName="brand"
            currentValue={activeBrand}
            allLabel={copy.all}
            options={facets.brands.map((b): FilterOption => ({ value: b.slug, label: b.name, count: b.count }))}
            preserve={preserveParams}
            locale={locale}
          />
          <FilterSelect
            label={copy.notes}
            paramName="note"
            currentValue={activeNote}
            allLabel={copy.all}
            options={facets.notes.map((n): FilterOption => ({ value: n.slug, label: noteLabel(n), count: n.count }))}
            preserve={preserveParams}
            locale={locale}
          />
          <FilterSelect
            label={copy.families}
            paramName="family"
            currentValue={activeFamily}
            allLabel={copy.all}
            options={facets.families.map((f): FilterOption => ({ value: f.slug, label: familyLabel(f.slug, lang), count: f.count }))}
            preserve={preserveParams}
            locale={locale}
          />
          <FilterSelect
            label={copy.genders}
            paramName="gender"
            currentValue={activeGender}
            allLabel={copy.all}
            options={facets.genders.map((g): FilterOption => ({ value: g.slug, label: genderLabel(g.slug, lang), count: g.count }))}
            preserve={preserveParams}
            locale={locale}
          />
          <FilterSelect
            label={copy.sort}
            paramName="sort"
            currentValue={activeSort}
            allLabel={copy.new}
            showAll={false}
            options={[
              { value: 'popular', label: copy.popular },
              { value: 'new', label: copy.new },
              { value: 'price_asc', label: copy.price_asc },
              { value: 'price_desc', label: copy.price_desc },
            ]}
            preserve={preserveParams}
            locale={locale}
          />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <p className="text-stone-500 font-sans">{t('empty')}</p>
          <Link
            href={`/${locale}/catalog`}
            className="inline-flex h-11 items-center bg-ink dark:bg-bone dark:text-ink px-6 text-xs font-semibold uppercase tracking-widest text-bone hover:bg-brass transition-all duration-300"
          >
            {copy.clearAll}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((p) => (
            <ProductCard key={p.id} product={p} locale={locale} />
          ))}
        </div>
      )}

      {meta.total_pages > 1 && (
        <nav className="flex items-center justify-center gap-4 pt-8 text-xs uppercase tracking-widest font-semibold">
          {page > 1 && (
            <Link
              href={pageHref(locale, sp, page - 1)}
              className="border border-border/80 px-5 py-2.5 hover:border-brass hover:text-brass transition-all"
            >
              ← {t('prev')}
            </Link>
          )}
          <span className="text-stone-400 font-bold">
            {t('pageOf', { page, total: meta.total_pages })}
          </span>
          {page < meta.total_pages && (
            <Link
              href={pageHref(locale, sp, page + 1)}
              className="border border-border/80 px-5 py-2.5 hover:border-brass hover:text-brass transition-all"
            >
              {t('next')} →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}

const pageHref = (
  locale: string,
  sp: Record<string, string | undefined>,
  page: number,
): string => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  for (const k of ['brand', 'note', 'perfumer', 'family', 'gender', 'q', 'sort'] as const) {
    if (sp[k]) params.set(k, sp[k]!);
  }
  return `/${locale}/catalog?${params.toString()}`;
};
