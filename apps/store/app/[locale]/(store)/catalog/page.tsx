import Link from 'next/link';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { type Locale } from '@/i18n/config';
import { ProductCard } from '@/components/catalog/product-card';
import { listProducts, type ProductSort } from '@/lib/catalog/products';
import { getFilterFacets } from '@/lib/catalog/facets';
import { FilterSelect, type FilterOption } from '@/components/catalog/filter-select';
import { MobileFilterDrawer } from '@/components/catalog/mobile-filter-drawer';
import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';

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

const SORT_COPY: Record<Lang, Record<ProductSort, string>> = {
  ru: { new: 'Новинки', popular: 'Популярные', price_asc: 'Дешевле', price_desc: 'Дороже' },
  en: { new: 'Newest', popular: 'Popular', price_asc: 'Price ↑', price_desc: 'Price ↓' },
  uz: { new: 'Yangi', popular: 'Ommabop', price_asc: 'Arzon', price_desc: 'Qimmat' },
};

const COPY: Record<
  Lang,
  {
    eyebrow: string;
    notes: string;
    brands: string;
    families: string;
    genders: string;
    sort: string;
    all: string;
    activeTitle: string;
    clearAll: string;
    prev: string;
    next: string;
    pageOf: string;
  }
> = {
  en: {
    eyebrow: 'EXCLUSIVE FRAGRANCES',
    notes: 'Notes',
    brands: 'Brands',
    families: 'Categories',
    genders: 'Gender',
    sort: 'Sort',
    all: 'All',
    activeTitle: 'Active filters',
    clearAll: 'Clear all',
    prev: 'Prev',
    next: 'Next',
    pageOf: 'Page {page} of {total}',
  },
  ru: {
    eyebrow: 'СЕЛЕКТИВНЫЕ АРОМАТЫ',
    notes: 'Ноты',
    brands: 'Бренды',
    families: 'Категории',
    genders: 'Пол',
    sort: 'Сортировка',
    all: 'Все',
    activeTitle: 'Активные фильтры',
    clearAll: 'Сбросить все',
    prev: 'Назад',
    next: 'Вперед',
    pageOf: 'Страница {page} из {total}',
  },
  uz: {
    eyebrow: 'EKSKLYUZIV ATIRLAR',
    notes: 'Notalar',
    brands: 'Brendlar',
    families: 'Kategoriyalar',
    genders: 'Jins',
    sort: 'Saralash',
    all: 'Barchasi',
    activeTitle: 'Faol filtrlar',
    clearAll: 'Hammasini tozalash',
    prev: 'Oldingi',
    next: 'Keyingi',
    pageOf: 'Sahifa {page} / {total}',
  },
};

const FAMILY_LABELS: Record<string, Record<Lang, string>> = {
  woody: { en: 'Woody', ru: 'Древесные', uz: 'Yogʻochli' },
  floral: { en: 'Floral', ru: 'Цветочные', uz: 'Gulli' },
  citrus: { en: 'Citrus', ru: 'Цитрусовые', uz: 'Sitrus' },
  aromatic: { en: 'Aromatic', ru: 'Aromatlar', uz: 'Xushboʻy' },
  oriental: { en: 'Oriental', ru: 'Восточные', uz: 'Sharqona' },
  green: { en: 'Green', ru: 'Зеленые', uz: 'Yashil' },
  gourmand: { en: 'Gourmand', ru: 'Гурманские', uz: 'Shirinli' },
  smoky: { en: 'Smoky', ru: 'Дымные', uz: 'Tutunli' },
  aquatic: { en: 'Aquatic', ru: 'Водные', uz: 'Suvli' },
  leather: { en: 'Leather', ru: 'Кожаные', uz: 'Charm' },
  chypre: { en: 'Chypre', ru: 'Шипровые', uz: 'Shipr' },
  fougere: { en: 'Fougère', ru: 'Фужерные', uz: 'Fujerli' },
};

const GENDER_LABELS: Record<string, Record<Lang, string>> = {
  unisex: { en: 'Unisex', ru: 'Унисекс', uz: 'Uniseks' },
  men: { en: 'Men', ru: 'Мужские', uz: 'Erkaklar' },
  women: { en: 'Women', ru: 'Женские', uz: 'Ayollar' },
};

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const humanizeSlug = (slug: string): string =>
  slug
    .split('-')
    .map((s) => (s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)))
    .join(' ');

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const lang = toLang(locale);
  const copy = COPY[lang];

  const t = await getTranslations('catalog');

  const note = first(sp.note);
  const brand = first(sp.brand);
  const family = first(sp.family);
  const gender = first(sp.gender);
  const q = first(sp.q);
  const perfumer = first(sp.perfumer);
  const accord = first(sp.accord);
  const sortParam = first(sp.sort);
  const sort: ProductSort = isSort(sortParam) ? sortParam : 'new';
  const pageRaw = Number(first(sp.page));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  // Active filter snapshot, preserved to build links.
  const active: Record<string, string | undefined> = {
    note,
    brand,
    family,
    gender,
    q,
    perfumer,
    accord,
    sort: sort === 'new' ? undefined : sort,
  };

  const [result, facets, activePerfumer, activeAccord] = await Promise.all([
    listProducts({ locale, sort, brand, note, family, gender, q, page, perfumer, accord }),
    getFilterFacets(locale),
    perfumer ? db.perfumer.findUnique({ where: { slug: perfumer }, select: { name: true } }) : null,
    accord ? db.accord.findUnique({ where: { slug: accord }, select: { name: true } }) : null,
  ]);

  const { data, meta } = result;

  const getLinkHref = (updates: Record<string, string | undefined>): string => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(active)) {
      if (v) next.set(k, v);
    }
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) next.delete(k);
      else next.set(k, v);
    }
    next.delete('page');
    const qs = next.toString();
    return `/${locale}/catalog${qs ? `?${qs}` : ''}`;
  };

  const activeNoteFacet = note ? facets.notes.find((n) => n.slug === note) ?? null : null;

  // Active-filter pills
  const activePills: { key: string; label: string; clearHref: string }[] = [];
  if (brand) {
    const b = facets.brands.find((x) => x.slug === brand);
    activePills.push({
      key: `brand:${brand}`,
      label: `${copy.brands}: ${b?.name ?? humanizeSlug(brand)}`,
      clearHref: getLinkHref({ brand: undefined }),
    });
  }
  if (note) {
    const n = facets.notes.find((x) => x.slug === note);
    activePills.push({
      key: `note:${note}`,
      label: `${copy.notes}: ${n?.name ?? humanizeSlug(note)}`,
      clearHref: getLinkHref({ note: undefined }),
    });
  }
  if (family) {
    activePills.push({
      key: `family:${family}`,
      label: `${copy.families}: ${FAMILY_LABELS[family]?.[lang] ?? humanizeSlug(family)}`,
      clearHref: getLinkHref({ family: undefined }),
    });
  }
  if (gender) {
    activePills.push({
      key: `gender:${gender}`,
      label: `${copy.genders}: ${GENDER_LABELS[gender]?.[lang] ?? humanizeSlug(gender)}`,
      clearHref: getLinkHref({ gender: undefined }),
    });
  }
  if (q) {
    activePills.push({
      key: `q:${q}`,
      label: `"${q}"`,
      clearHref: getLinkHref({ q: undefined }),
    });
  }
  if (perfumer && activePerfumer) {
    activePills.push({
      key: `perfumer:${perfumer}`,
      label: `${copy.brands === 'Brendlar' ? 'Parfyumer' : copy.brands === 'Brands' ? 'Perfumer' : 'Парфюмер'}: ${activePerfumer.name}`,
      clearHref: getLinkHref({ perfumer: undefined }),
    });
  }
  if (accord && activeAccord) {
    activePills.push({
      key: `accord:${accord}`,
      label: `${copy.notes === 'Notalar' ? 'Akkord' : copy.notes === 'Notes' ? 'Accord' : 'Аккорд'}: ${resolveLocaleText(activeAccord.name, locale)}`,
      clearHref: getLinkHref({ accord: undefined }),
    });
  }

  const clearAllHref = `/${locale}/catalog${sort === 'new' ? '' : `?sort=${sort}`}`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-12 space-y-6">
      <header className="space-y-1">
        <span className="text-[10px] uppercase tracking-[0.3em] text-brass font-bold">
          {copy.eyebrow}
        </span>
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl tracking-tight text-ink dark:text-bone">
            {t('title')}
          </h1>
          <p className="text-xs uppercase tracking-widest text-stone-400">
            {t('foundCount', { count: meta.total })}
          </p>
        </div>
      </header>

      {/* Mobile-Native Filter Drawer & Sticky Utility Bar */}
      <MobileFilterDrawer
        locale={locale}
        facets={facets}
        currentFilters={{ brand, note, family, gender, sort }}
        preserve={active}
        totalCount={meta.total}
        familyLabels={Object.fromEntries(
          facets.families.map((f) => [f.slug, FAMILY_LABELS[f.slug]?.[lang] ?? f.slug])
        )}
        genderLabels={Object.fromEntries(
          facets.genders.map((g) => [g.slug, GENDER_LABELS[g.slug]?.[lang] ?? g.slug])
        )}
        copy={{
          brands: copy.brands,
          notes: copy.notes,
          families: copy.families,
          genders: copy.genders,
          sort: copy.sort,
          clearAll: copy.clearAll,
          apply: locale === 'ru' ? 'Применить' : locale === 'uz' ? 'Tasdiqlash' : 'Apply',
          close: locale === 'ru' ? 'Закрыть' : locale === 'uz' ? 'Yopish' : 'Close',
          all: copy.all,
          foundCount: locale === 'ru' ? 'Найдено: {count}' : locale === 'uz' ? '{count} ta mahsulot' : '{count} products',
          searchPlaceholder: locale === 'ru' ? 'Поиск...' : locale === 'uz' ? 'Qidiruv...' : 'Search...',
          sortBy: locale === 'ru' ? 'Фильтры' : locale === 'uz' ? 'Filtrlar' : 'Filters',
          popular: SORT_COPY[lang].popular,
          newest: SORT_COPY[lang].new,
          priceAsc: SORT_COPY[lang].price_asc,
          priceDesc: SORT_COPY[lang].price_desc,
        }}
      />

      {/* Premium Active Note Banner (Fragrantica-style) */}
      {activeNoteFacet && (
        <section className="flex items-center gap-4 border-l-2 border-brass bg-stone-50/50 p-4 dark:bg-stone-900/10">
          {activeNoteFacet.icon_url ? (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-1 ring-brass/30 shadow-sm bg-white">
              <Image
                src={activeNoteFacet.icon_url}
                alt={activeNoteFacet.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-14 w-14 shrink-0 rounded-full bg-brass/10 flex items-center justify-center border border-brass/30">
              <span className="text-brass font-serif text-lg font-bold">
                {activeNoteFacet.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="space-y-0.5">
            <span className="text-[9px] uppercase font-mono tracking-[0.3em] text-brass font-bold">
              {copy.notes}
            </span>
            <h2 className="font-display text-2xl text-ink dark:text-bone">
              {activeNoteFacet.name}
            </h2>
          </div>
        </section>
      )}

      {/* Active filters pill bar */}
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
            >
              <span>{p.label}</span>
              <span aria-hidden className="text-stone-400 group-hover:text-brass">×</span>
            </Link>
          ))}
          <Link
            href={clearAllHref}
            className="ml-auto text-[10px] uppercase tracking-[0.2em] text-brass hover:underline font-bold"
          >
            {copy.clearAll}
          </Link>
        </div>
      )}

      {/* Dropdown Filters Selector Panel - Desktop Only */}
      <div className="hidden md:block border-y border-border/85 py-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          <FilterSelect
            label={copy.brands}
            paramName="brand"
            currentValue={brand ?? ''}
            allLabel={copy.all}
            options={facets.brands.map((b): FilterOption => ({ value: b.slug, label: b.name, count: b.count }))}
            preserve={active}
            locale={locale}
          />
          <FilterSelect
            label={copy.notes}
            paramName="note"
            currentValue={note ?? ''}
            allLabel={copy.all}
            options={facets.notes.map((n): FilterOption => ({ value: n.slug, label: n.name, count: n.count }))}
            preserve={active}
            locale={locale}
          />
          <FilterSelect
            label={copy.families}
            paramName="family"
            currentValue={family ?? ''}
            allLabel={copy.all}
            options={facets.families.map((f): FilterOption => ({ value: f.slug, label: FAMILY_LABELS[f.slug]?.[lang] ?? f.slug, count: f.count }))}
            preserve={active}
            locale={locale}
          />
          <FilterSelect
            label={copy.genders}
            paramName="gender"
            currentValue={gender ?? ''}
            allLabel={copy.all}
            options={facets.genders.map((g): FilterOption => ({ value: g.slug, label: GENDER_LABELS[g.slug]?.[lang] ?? g.slug, count: g.count }))}
            preserve={active}
            locale={locale}
          />
          <FilterSelect
            label={copy.sort}
            paramName="sort"
            currentValue={sort}
            allLabel={SORT_COPY[lang].new}
            showAll={false}
            options={[
              { value: 'popular', label: SORT_COPY[lang].popular },
              { value: 'new', label: SORT_COPY[lang].new },
              { value: 'price_asc', label: SORT_COPY[lang].price_asc },
              { value: 'price_desc', label: SORT_COPY[lang].price_desc },
            ]}
            preserve={active}
            locale={locale}
          />
        </div>
      </div>

      {/* Results grid */}
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

      {/* Pagination controls */}
      {meta.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-4 pt-8 text-xs uppercase tracking-widest font-semibold">
          {page > 1 ? (
            <Link
              href={getLinkHref({ page: String(page - 1) })}
              className="border border-border/80 px-5 py-2.5 hover:border-brass hover:text-brass transition-all"
            >
              ← {copy.prev}
            </Link>
          ) : (
            <span className="border border-border/40 px-5 py-2.5 text-stone-400 cursor-not-allowed">
              ← {copy.prev}
            </span>
          )}
          <span className="text-stone-400 font-bold">
            {copy.pageOf.replace('{page}', String(page)).replace('{total}', String(meta.totalPages))}
          </span>
          {page < meta.totalPages ? (
            <Link
              href={getLinkHref({ page: String(page + 1) })}
              className="border border-border/80 px-5 py-2.5 hover:border-brass hover:text-brass transition-all"
            >
              {copy.next} →
            </Link>
          ) : (
            <span className="border border-border/40 px-5 py-2.5 text-stone-400 cursor-not-allowed">
              {copy.next} →
            </span>
          )}
        </nav>
      )}
    </main>
  );
}
