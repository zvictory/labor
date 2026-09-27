import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { locales, type Locale } from '@/i18n/config';
import { Hero } from '@/components/home/hero';
import { SelectionCard } from '@/components/home/selection-card';
import { CustomParfumCta } from '@/components/home/custom-parfum-cta';
import { getFeaturedProduct, listProducts } from '@/lib/catalog/products';
import { FAMILY_FILTERS, NOTE_FAMILIES, familyLabel } from '@/lib/catalog/note-families';

type Props = { params: Promise<{ locale: Locale }> };

type Lang = 'en' | 'ru' | 'uz';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

// Section titles and links, per locale. Component-local (not in next-intl
// catalogs) to match the apps/web homepage convention.
type HomeCopy = {
  selection: string;
  viewAll: string;
  emptyProducts: string;
  families: string;
  allFamilies: (n: number) => string;
};

const COPY: Record<Lang, HomeCopy> = {
  ru: {
    selection: 'Подборка',
    viewAll: 'Весь каталог',
    emptyProducts: 'Скоро здесь появятся ароматы',
    families: 'Какое семейство?',
    allFamilies: (n) => `Все ${n}`,
  },
  en: {
    selection: 'Selection',
    viewAll: 'Full catalogue',
    emptyProducts: 'Fragrances are on their way',
    families: 'Which family?',
    allFamilies: (n) => `All ${n}`,
  },
  uz: {
    selection: 'Saralangan',
    viewAll: 'Butun katalog',
    emptyProducts: 'Tez orada hidlar paydo boʻladi',
    families: 'Qaysi oila?',
    allFamilies: (n) => `Barchasi ${n}`,
  },
};

// "Few things visible at once." The shop's island carries 84 testers in seven
// blocks; the home page carries one bottle and twelve cards. Depth still exists
// — it sits behind "full catalogue", the way the archive drawers sit under the
// island. Twelve also divides evenly into the 2-, 3- and 4-column grids.
const HOME_GRID = 12;

const chipCls =
  'border-hairline dark:border-gunmetal inline-flex min-h-11 items-center border px-3.5 font-mono text-label tracking-[0.1em] uppercase transition-colors';

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const lang = toLang(locale);
  const c = COPY[lang];

  // ── data-access layer: called directly from the RSC, no HTTP hop ──────────────
  const [hero, newRes] = await Promise.all([
    getFeaturedProduct(locale),
    listProducts({ locale, sort: 'new' }),
  ]);

  // The hero bottle is not repeated in the grid below it.
  const selection = newRes.data.filter((p) => p.id !== hero?.id).slice(0, HOME_GRID);

  return (
    <>
      {hero && <Hero product={hero} locale={locale} lang={lang} />}

      <section className="border-border border-b">
        <div className="container flex flex-col gap-3 pt-6 pb-8 md:gap-6 md:py-16">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[22px] leading-7 font-semibold tracking-[-0.02em] md:text-4xl md:leading-tight">
              {c.selection}
            </h2>
            <Link
              href={`/${locale}/catalog`}
              className="text-label inline-flex min-h-11 items-center font-mono tracking-[0.1em] uppercase underline underline-offset-4"
            >
              {c.viewAll}
            </Link>
          </div>

          {selection.length > 0 ? (
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {selection.map((product) => (
                <SelectionCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-10 text-center text-sm">{c.emptyProducts}</p>
          )}
        </div>
      </section>

      <section className="border-border border-b">
        <div className="container flex flex-col gap-3.5 py-7 md:gap-6 md:py-16">
          <h2 className="text-[22px] leading-7 font-semibold tracking-[-0.02em] md:text-4xl md:leading-tight">
            {c.families}
          </h2>
          <div className="flex flex-wrap gap-2">
            {FAMILY_FILTERS.map((family) => (
              <Link
                key={family}
                href={`/${locale}/catalog?family=${family}`}
                className={`${chipCls} hover:border-graphite dark:hover:border-offwhite`}
              >
                {familyLabel(family, locale)}
              </Link>
            ))}
            {/* Every family, grouped, lives on the notes page. */}
            <Link
              href={`/${locale}/notes`}
              className={`${chipCls} bg-graphite text-offwhite border-graphite dark:bg-offwhite dark:text-graphite dark:border-offwhite hover:opacity-85`}
            >
              {c.allFamilies(NOTE_FAMILIES.length)}
            </Link>
          </div>
        </div>
      </section>

      {/* Custom parfum (static marketing; CTA → Telegram until a Phase 2 flow) */}
      <CustomParfumCta lang={lang} />
    </>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
