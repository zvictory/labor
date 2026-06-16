import Image from 'next/image';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { locales, type Locale } from '@/i18n/config';
import { HeroSlider } from '@/components/home/hero-slider';
import { FinderBand } from '@/components/home/finder-band';
import { MoodBrowser } from '@/components/home/mood-browser';
import { ProductGrid } from '@/components/home/product-grid';
import { CustomParfumCta } from '@/components/home/custom-parfum-cta';
import { TrustStrip } from '@/components/home/trust-strip';
import { TelegramCta } from '@/components/home/telegram-cta';
import { listProducts } from '@/lib/catalog/products';
import { getNotes } from '@/lib/catalog/notes';
import { getBrands } from '@/lib/catalog/brands';

type Props = { params: Promise<{ locale: Locale }> };

type Lang = 'en' | 'ru' | 'uz';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

// Section eyebrows + "view all" labels + slide-2 copy, per locale. Component-local
// (not in next-intl catalogs) to match the apps/web homepage convention. NOTE the
// second product grid is labelled "Popular" (sourced from sort:'popular'), NOT
// "Bestsellers" — there is no bestseller signal in the data-access layer yet.
type HomeCopy = {
  eyebrowNew: string;
  eyebrowPopular: string;
  titlePopular: string;
  eyebrowNotes: string;
  eyebrowBrands: string;
  emptyProducts: string;
  emptyNotes: string;
  emptyBrands: string;
  viewAllNew: string;
  viewAllPopular: string;
  viewAllNotes: string;
  viewAllBrands: string;
  slide2Tagline: string;
  slide2Headline: string;
  slide2Sub: string;
};

const COPY: Record<Lang, HomeCopy> = {
  ru: {
    eyebrowNew: 'Свежие поступления',
    eyebrowPopular: 'Популярное',
    titlePopular: 'Популярное',
    eyebrowNotes: 'Парфюмерные ингредиенты',
    eyebrowBrands: 'Официальный дистрибьютор',
    emptyProducts: 'Скоро здесь появятся ароматы',
    emptyNotes: 'Ноты скоро появятся',
    emptyBrands: 'Бренды скоро появятся',
    viewAllNew: 'Все новинки',
    viewAllPopular: 'Смотреть все',
    viewAllNotes: 'Все ноты',
    viewAllBrands: 'Все бренды',
    slide2Tagline: 'СВЕЖИЙ. ЛЕСНОЙ. ЧИСТЫЙ',
    slide2Headline: 'Гармония дикой природы',
    slide2Sub:
      'Откройте для себя нашу древесную коллекцию с нотами мха, влажного кедра и свежих лесных трав.',
  },
  en: {
    eyebrowNew: 'Just blended',
    eyebrowPopular: 'Most loved',
    titlePopular: 'Popular',
    eyebrowNotes: 'Olfactive pyramid',
    eyebrowBrands: 'Niche houses',
    emptyProducts: 'Fragrances are on their way',
    emptyNotes: 'Notes coming soon',
    emptyBrands: 'Brands coming soon',
    viewAllNew: 'View all',
    viewAllPopular: 'View all',
    viewAllNotes: 'Browse notes',
    viewAllBrands: 'All brands',
    slide2Tagline: 'FRESH. WOODY. PURE',
    slide2Headline: 'Harmony of Wild Woods',
    slide2Sub:
      'Explore our curated woody scents featuring deep notes of moss, damp cedar wood, and fresh forest botanicals.',
  },
  uz: {
    eyebrowNew: 'Yangi tushganlar',
    eyebrowPopular: 'Ommabop',
    titlePopular: 'Ommabop',
    eyebrowNotes: 'Parfyumeriya ingredientlari',
    eyebrowBrands: 'Rasmiy distribyutor',
    emptyProducts: 'Tez orada hidlar paydo boʻladi',
    emptyNotes: 'Notalar tez orada',
    emptyBrands: 'Brendlar tez orada',
    viewAllNew: 'Barcha yangiliklar',
    viewAllPopular: 'Barchasini koʻrish',
    viewAllNotes: 'Barcha notalar',
    viewAllBrands: 'Barcha brendlar',
    slide2Tagline: 'TOZA. OʻRMON. YANGI',
    slide2Headline: 'Yovvoyi tabiat uygʻunligi',
    slide2Sub:
      'Yoʻsin, nam kedr va yangi oʻrmon oʻtlari notalari bilan boyitilgan yogʻoch kolleksiyamizni kashf eting.',
  },
};

// French sub-label per known note slug (purely decorative, mirrors apps/web).
const NOTE_FRENCH: Record<string, string> = {
  sandalwood: 'BOIS DE SANTAL',
  rose: 'ROSE CRIMSOM',
  bergamot: 'BERGAMOTE CITRON',
  'black-tea': 'THÉ NOIR FUMÉ',
  vetiver: 'VÉTIVER RACINE',
  musk: 'MUSC BLANC',
};

// Slugs we ship art for under public/notes/<slug>.png. The notes section only
// surfaces notes that both exist in the catalog (getNotes) AND have art.
const NOTE_IMAGE_SLUGS = ['sandalwood', 'rose', 'bergamot', 'black-tea', 'vetiver', 'musk'] as const;

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const b = await getTranslations('brand');
  const lang = toLang(locale);
  const c = COPY[lang];

  // ── data-access layer: called directly from the RSC, no HTTP hop ──────────────
  const [newRes, popularRes, notes, brands] = await Promise.all([
    listProducts({ locale, sort: 'new' }),
    listProducts({ locale, sort: 'popular' }),
    getNotes(locale),
    getBrands(locale),
  ]);

  // Notes section: intersect catalog notes with the slugs we have art for, keep
  // the curated display order, cap at 6.
  const noteBySlug = new Map(notes.map((n) => [n.slug, n]));
  const featuredNotes = NOTE_IMAGE_SLUGS.filter((slug) => noteBySlug.has(slug))
    .map((slug) => {
      const note = noteBySlug.get(slug)!;
      return {
        slug,
        name: note.name,
        family: note.family ?? '',
        french: NOTE_FRENCH[slug] ?? note.name.toUpperCase(),
        image: `/notes/${slug}.png`,
      };
    })
    .slice(0, 6);

  // Brands section: data-driven text cards from getBrands, niche houses first.
  const featuredBrands = [...brands]
    .sort((x, y) => Number(y.niche ?? false) - Number(x.niche ?? false))
    .slice(0, 8);

  const slides = [
    {
      image: '/slides/hero.png',
      tagline: b('tagline'),
      headline: t('hero.headline'),
      sub: t('hero.sub'),
      cta: t('hero.cta'),
      href: `/${locale}/catalog`,
    },
    {
      image: '/slides/woody.png',
      tagline: c.slide2Tagline,
      headline: c.slide2Headline,
      sub: c.slide2Sub,
      cta: t('hero.cta'),
      href: `/${locale}/catalog?note=vetiver`,
    },
  ];

  return (
    <>
      {/* Campaign hero slideshow (client island) */}
      <HeroSlider slides={slides} />

      {/* Scent finder band (static; links to /find-your-perfume) */}
      <FinderBand locale={locale} lang={lang} />

      {/* New arrivals — listProducts({ sort:'new' }) */}
      <ProductGrid
        eyebrow={c.eyebrowNew}
        title={t('sections.newArrivals')}
        products={newRes.data}
        locale={locale}
        viewAllLabel={c.viewAllNew}
        viewAllHref={`/${locale}/catalog?sort=new`}
        emptyLabel={c.emptyProducts}
        className="bg-stone-50/50 dark:bg-stone-900/10"
      />

      {/* Shop by mood (static; tiles map to live /catalog?note= slugs) */}
      <MoodBrowser locale={locale} lang={lang} />

      {/* Popular — listProducts({ sort:'popular' }) (NOT "Bestsellers") */}
      <ProductGrid
        eyebrow={c.eyebrowPopular}
        title={c.titlePopular}
        products={popularRes.data}
        locale={locale}
        viewAllLabel={c.viewAllPopular}
        viewAllHref={`/${locale}/catalog?sort=popular`}
        emptyLabel={c.emptyProducts}
      />

      {/* Fragrance notes — getNotes(locale) ∩ shipped art */}
      <section className="container border-b border-border bg-stone-50/50 py-24 dark:bg-stone-900/10">
        <div className="mb-12 flex items-baseline justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
              {c.eyebrowNotes}
            </span>
            <h2 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
              {t('sections.byNotes')}
            </h2>
          </div>
          <Link
            href={`/${locale}/notes`}
            className="group flex items-center gap-1 text-xs uppercase tracking-widest text-ink-muted transition-all hover:text-brass dark:text-stone-400"
          >
            {c.viewAllNotes}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        {featuredNotes.length > 0 ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {featuredNotes.map((note) => (
              <Link
                key={note.slug}
                href={`/${locale}/catalog?note=${note.slug}`}
                className="group relative flex aspect-[3/4] cursor-pointer flex-col justify-end overflow-hidden border border-border/60 p-5 transition-colors duration-500 hover:border-brass/60"
              >
                <div className="absolute inset-0 z-0">
                  <Image
                    src={note.image}
                    alt={note.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    className="scale-100 object-cover grayscale transition-all duration-700 ease-out group-hover:scale-105 group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1714] via-[#1A1714]/40 to-transparent opacity-85 transition-opacity duration-500 group-hover:opacity-75" />
                </div>
                <div className="relative z-10 flex flex-col text-left">
                  <span className="mb-1 font-mono text-[8px] font-bold uppercase tracking-[0.25em] text-[#8B6F47] dark:text-[#A88B5B]">
                    {note.french}
                  </span>
                  <span className="font-mono text-sm font-bold uppercase tracking-wider text-bone transition-colors duration-300 group-hover:text-brass">
                    {note.name}
                  </span>
                  {note.family && (
                    <span className="mt-1 translate-y-2 text-[9px] tracking-wide text-stone-400 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      {note.family}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-ink-muted dark:text-stone-400">
            {c.emptyNotes}
          </p>
        )}
      </section>

      {/* Brands — getBrands(locale), elegant data-driven text cards */}
      <section className="container py-24">
        <div className="mb-12 flex items-baseline justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
              {c.eyebrowBrands}
            </span>
            <h2 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
              {t('sections.byBrand')}
            </h2>
          </div>
          <Link
            href={`/${locale}/brands`}
            className="group flex items-center gap-1 text-xs uppercase tracking-widest text-ink-muted transition-all hover:text-brass dark:text-stone-400"
          >
            {c.viewAllBrands}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        {featuredBrands.length > 0 ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {featuredBrands.map((brand) => (
              <Link
                key={brand.slug}
                href={`/${locale}/catalog?brand=${brand.slug}`}
                className="group flex flex-col items-center justify-center border border-border/80 bg-bone p-8 text-center transition-all duration-300 hover:border-brass/70 hover:bg-stone-50 dark:bg-[#1A1714]/30 dark:hover:bg-[#1A1714]/60"
              >
                <span className="mb-4 flex h-16 w-full items-center justify-center font-display text-3xl text-ink transition-colors duration-300 group-hover:text-brass dark:text-bone">
                  {brand.name}
                </span>
                <p className="text-[9px] uppercase tracking-[0.25em] text-ink-muted transition-colors duration-300 group-hover:text-brass dark:text-stone-400">
                  {brand.country ?? (brand.niche ? 'Niche' : ' ')}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-ink-muted dark:text-stone-400">
            {c.emptyBrands}
          </p>
        )}
      </section>

      {/* Custom parfum (static marketing; CTA → Telegram until a Phase 2 flow) */}
      <CustomParfumCta lang={lang} />

      {/* Trust / authenticity (static) */}
      <TrustStrip locale={locale} lang={lang} />

      {/* Telegram mini-app CTA (static; live bot link) */}
      <TelegramCta lang={lang} />
    </>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
