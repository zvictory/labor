import Image from 'next/image';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

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
import { getBrands, BRAND_LOGOS } from '@/lib/catalog/brands';
import { getFilterFacets } from '@/lib/catalog/facets';
import { QuickFilter } from '@/components/home/quick-filter';

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
  slide3Tagline: string;
  slide3Headline: string;
  slide3Sub: string;
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
    slide3Tagline: 'ЭЛЕГАНТНЫЙ. ЦВЕТОЧНЫЙ. НИШЕВЫЙ',
    slide3Headline: 'Лепестки в тумане',
    slide3Sub:
      'Окунитесь в наши нежные композиции с белой розой и мускусом, объединяющие изысканные шедевры европейских парфюмерных домов.',
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
    slide3Tagline: 'ELEGANT. FLORAL. NICHE',
    slide3Headline: 'Petals in the Mist',
    slide3Sub:
      'Indulge in our delicate white rose and musk blends, bringing together the absolute finest niche creations of European houses.',
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
    slide3Tagline: 'NAFIS. GULLI. EKSKLYUZIV',
    slide3Headline: 'Tumandagi atirgul barglari',
    slide3Sub:
      'Evropa uylarining eng sara eksklyuziv ijod namunalarini birlashtirgan oq atirgul va musk aralashmalarimizdan bahramand bo‘ling.',
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

const FAMILY_LABELS: Record<string, Record<string, string>> = {
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



export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Redirect mobile users directly to the shop/catalog
  const reqHeaders = await headers();
  const userAgent = reqHeaders.get('user-agent') || '';
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
  if (isMobile) {
    redirect(`/${locale}/catalog`);
  }

  const t = await getTranslations('home');
  const b = await getTranslations('brand');
  const lang = toLang(locale);
  const c = COPY[lang];

  // ── data-access layer: called directly from the RSC, no HTTP hop ──────────────
  const [newRes, popularRes, notes, brands, facets] = await Promise.all([
    listProducts({ locale, sort: 'new' }),
    listProducts({ locale, sort: 'popular' }),
    getNotes(locale),
    getBrands(locale),
    getFilterFacets(locale),
  ]);

  const filterBrands = facets.brands.map((b) => ({ slug: b.slug, name: b.name }));
  const filterNotes = facets.notes.slice(0, 30).map((n) => ({ slug: n.slug, name: n.name }));
  const filterFamilies = facets.families.map((f) => ({
    slug: f.slug,
    name: FAMILY_LABELS[f.slug]?.[lang] ?? f.slug,
  }));

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
      image: '/slides/armani.png', // Armani
      tagline: 'GIORGIO ARMANI',
      headline: 'Acqua di Gio Profumo',
      sub: locale === 'ru'
        ? 'Глубокий, сложный аромат, рожденный из союза вулканических пород и океанской воды.'
        : locale === 'uz'
        ? 'Vulkanik jinslar va okean suvi ittifoqidan tug\'ilgan chuqur, mukammal atir.'
        : 'A deep, sophisticated fragrance born from volcanic rock and deep ocean waters.',
      cta: locale === 'ru' ? 'Купить аромат' : locale === 'uz' ? 'Sotib olish' : 'Shop Scent',
      href: `/${locale}/product/acqua-di-gio-profumo`,
      scentFamily: locale === 'ru' ? 'Водные • Древесные • Дымные' : locale === 'uz' ? 'Suvli • Yog\'ochli • Tutunli' : 'Aquatic • Woody • Smoky',
      scentNotes: locale === 'ru' ? ['Морские ноты', 'Ладан', 'Розмарин'] : locale === 'uz' ? ['Dengiz notalari', 'Ladan', 'Rozmarin'] : ['Sea Notes', 'Incense', 'Rosemary'],
    },
    {
      image: '/slides/jomalone.png', // Jo Malone
      tagline: 'JO MALONE',
      headline: 'Wood Sage & Sea Salt',
      sub: locale === 'ru'
        ? 'Побег от повседневности к ветреному побережью. Свежий воздух с морской солью и брызгами.'
        : locale === 'uz'
        ? 'Shamal esadigan dengiz bo\'yiga qochish. Dengiz tuzi va purkagich bilan toza havo.'
        : 'Escape the everyday along the windswept shore. Waves breaking white, the air fresh with sea salt.',
      cta: locale === 'ru' ? 'Купить аромат' : locale === 'uz' ? 'Sotib olish' : 'Shop Scent',
      href: `/${locale}/product/wood-sage-sea-salt`,
      scentFamily: locale === 'ru' ? 'Ароматические • Морские • Цитрусовые' : locale === 'uz' ? 'Xushbo\'y • Dengiz • Sitrus' : 'Aromatic • Marine • Citrus',
      scentNotes: locale === 'ru' ? ['Морская соль', 'Шалфей', 'Грейпфрут'] : locale === 'uz' ? ['Dengiz tuzi', 'Shalfej', 'Greypfrut'] : ['Sea Salt', 'Sage', 'Grapefruit'],
    },
    {
      image: '/slides/banderas.png', // Antonio Banderas
      tagline: 'ANTONIO BANDERAS',
      headline: 'Blue Seduction',
      sub: locale === 'ru'
        ? 'Свежий современный аромат, передающий суть спонтанного соблазнения. Энергичный и искрящийся.'
        : locale === 'uz'
        ? 'Sarmast qiluvchi, o\'ziga tortadigan yangi va zamonaviy parfyum.'
        : 'A fresh, modern scent that captures the essence of spontaneous seduction. Energetic, sparkling, and deeply seductive.',
      cta: locale === 'ru' ? 'Купить аромат' : locale === 'uz' ? 'Sotib olish' : 'Shop Scent',
      href: `/${locale}/product/blue-seduction`,
      scentFamily: locale === 'ru' ? 'Свежие Пряные • Фруктовые • Янтарные' : locale === 'uz' ? 'Oq atirgul • Mevali • Musk' : 'Fresh Spicy • Fruity • Amber',
      scentNotes: locale === 'ru' ? ['Мята', 'Дыня', 'Капучино'] : locale === 'uz' ? ['Yalpiz', 'Qovun', 'Kapuchino'] : ['Mint', 'Melon', 'Cappuccino'],
    },
  ];

  return (
    <>
      {/* Campaign hero slideshow (client island) */}
      <HeroSlider slides={slides} />

      {/* Interactive Quick Filter Section */}
      <QuickFilter
        brands={filterBrands}
        notes={filterNotes}
        families={filterFamilies}
        locale={locale}
      />

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
            {featuredBrands.map((brand) => {
              const ext = BRAND_LOGOS[brand.slug];
              return (
                <Link
                  key={brand.slug}
                  href={`/${locale}/catalog?brand=${brand.slug}`}
                  className="group flex flex-col items-center justify-center border border-border/80 bg-bone p-8 text-center transition-all duration-300 hover:border-brass/70 hover:bg-stone-50 dark:bg-[#1A1714]/30 dark:hover:bg-[#1A1714]/60"
                >
                  <div className="relative mb-4 flex h-16 w-full items-center justify-center transition-transform duration-300 group-hover:scale-105">
                    {ext ? (
                      <Image
                        src={`/brands/${brand.slug}.${ext}`}
                        alt={brand.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-contain dark:brightness-0 dark:invert"
                      />
                    ) : (
                      <span className="font-display text-2xl text-ink transition-colors duration-300 group-hover:text-brass dark:text-bone">
                        {brand.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-ink-muted transition-colors duration-300 group-hover:text-brass dark:text-stone-400">
                    {brand.country ?? (brand.niche ? 'Niche' : ' ')}
                  </p>
                </Link>
              );
            })}
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
