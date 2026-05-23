import Image from 'next/image';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/i18n/config';
import { HeroSlider } from '@/components/home/hero-slider';
import { ProductCard } from '@/components/catalog/product-card';
import { listProducts, type ProductCard as Card } from '@/lib/api/products';

type Props = { params: Promise<{ locale: Locale }> };

type Lang = 'en' | 'ru' | 'uz' | 'uzc';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz', 'uzc'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

// Section eyebrows + "view all" links + slide 2 copy, per locale. Lives here
// (not in next-intl catalogs) to match the catalog-page convention for
// component-local copy.
type HomeCopy = {
  eyebrowNew: string;
  eyebrowBest: string;
  eyebrowNotes: string;
  eyebrowBrands: string;
  viewAllNew: string;
  viewAllBest: string;
  viewAllNotes: string;
  viewAllBrands: string;
  slide2Tagline: string;
  slide2Headline: string;
  slide2Sub: string;
};

const COPY: Record<Lang, HomeCopy> = {
  ru: {
    eyebrowNew: 'Свежие поступления',
    eyebrowBest: 'Хиты продаж',
    eyebrowNotes: 'Парфюмерные ингредиенты',
    eyebrowBrands: 'Официальный дистрибьютор',
    viewAllNew: 'Все новинки',
    viewAllBest: 'Все бестселлеры',
    viewAllNotes: 'Все ноты',
    viewAllBrands: 'Все бренды',
    slide2Tagline: 'СВЕЖИЙ. ЛЕСНОЙ. ЧИСТЫЙ',
    slide2Headline: 'Гармония дикой природы',
    slide2Sub:
      'Откройте для себя нашу древесную коллекцию с нотами мха, влажного кедра и свежих лесных трав.',
  },
  en: {
    eyebrowNew: 'Just blended',
    eyebrowBest: 'Customer favorites',
    eyebrowNotes: 'Olfactive pyramid',
    eyebrowBrands: 'Niche houses',
    viewAllNew: 'View all',
    viewAllBest: 'View all',
    viewAllNotes: 'Browse notes',
    viewAllBrands: 'All brands',
    slide2Tagline: 'FRESH. WOODY. PURE',
    slide2Headline: 'Harmony of Wild Woods',
    slide2Sub:
      'Explore our curated woody scents featuring deep notes of moss, damp cedar wood, and fresh forest botanicals.',
  },
  uz: {
    eyebrowNew: 'Yangi tushganlar',
    eyebrowBest: 'Eng ko‘p sotilganlar',
    eyebrowNotes: 'Parfyumeriya ingredientlari',
    eyebrowBrands: 'Rasmiy distribyutor',
    viewAllNew: 'Barcha yangiliklar',
    viewAllBest: 'Barcha bestsellerlar',
    viewAllNotes: 'Barcha notalar',
    viewAllBrands: 'Barcha brendlar',
    slide2Tagline: 'TOZA. O‘RMON. YANGI',
    slide2Headline: 'Yovvoyi tabiat uyg‘unligi',
    slide2Sub:
      'Yo‘sin, nam kedr va yangi o‘rmon o‘tlari notalari bilan boyitilgan yog‘och kolleksiyamizni kashf eting.',
  },
  uzc: {
    eyebrowNew: 'Янги тушганлар',
    eyebrowBest: 'Энг кўп сотилганлар',
    eyebrowNotes: 'Парфюмерия ингредиентлари',
    eyebrowBrands: 'Расмий дистрибютор',
    viewAllNew: 'Барча янгиликлар',
    viewAllBest: 'Барча бестселлерлар',
    viewAllNotes: 'Барча ноталар',
    viewAllBrands: 'Барча брендлар',
    slide2Tagline: 'ТОЗА. ЎРМОН. ЯНГИ',
    slide2Headline: 'Ёввойи табиат уйғунлиги',
    slide2Sub:
      'Йўсин, нам кедр ва янги ўрмон ўтлари ноталари билан бойитилган ёғоч коллекциямизни кашф этинг.',
  },
};

// Popular notes name + descriptor per locale, keyed by note slug.
type NoteCopy = { name: string; descriptor: string };
const POPULAR_NOTE_COPY: Record<Lang, Record<string, NoteCopy>> = {
  ru: {
    sandalwood: { name: 'Сандал', descriptor: 'Богатый • Древесный' },
    rose: { name: 'Роза', descriptor: 'Нежный • Цветочный' },
    bergamot: { name: 'Бергамот', descriptor: 'Яркий • Цитрусовый' },
    'black-tea': { name: 'Черный чай', descriptor: 'Дымный • Пряный' },
    vetiver: { name: 'Ветивер', descriptor: 'Землистый • Зеленый' },
    musk: { name: 'Мускус', descriptor: 'Чистый • Пудровый' },
  },
  en: {
    sandalwood: { name: 'Sandalwood', descriptor: 'Rich • Woody' },
    rose: { name: 'Rose', descriptor: 'Dewy • Floral' },
    bergamot: { name: 'Bergamot', descriptor: 'Vibrant • Citrus' },
    'black-tea': { name: 'Black Tea', descriptor: 'Smoky • Black Tea' },
    vetiver: { name: 'Vetiver', descriptor: 'Earthy • Vetiver' },
    musk: { name: 'Musk', descriptor: 'Clean • Velvet Musk' },
  },
  uz: {
    sandalwood: { name: 'Sandal', descriptor: 'Boy • Yog‘ochli' },
    rose: { name: 'Atirgul', descriptor: 'Nozik • Gulli' },
    bergamot: { name: 'Bergamot', descriptor: 'Yorqin • Sitrus' },
    'black-tea': { name: 'Qora choy', descriptor: 'Tutunli • Achchiq' },
    vetiver: { name: 'Vetiver', descriptor: 'Tuproqli • Yashil' },
    musk: { name: 'Muskus', descriptor: 'Toza • Yumshoq' },
  },
  uzc: {
    sandalwood: { name: 'Сандал', descriptor: 'Бой • Ёғочли' },
    rose: { name: 'Атиргул', descriptor: 'Нозик • Гулли' },
    bergamot: { name: 'Бергамот', descriptor: 'Ёрқин • Ситрус' },
    'black-tea': { name: 'Қора чой', descriptor: 'Тутунли • Аччиқ' },
    vetiver: { name: 'Ветивер', descriptor: 'Тупроқли • Яшил' },
    musk: { name: 'Мускус', descriptor: 'Тоза • Юмшоқ' },
  },
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const b = await getTranslations('brand');
  const lang = toLang(locale);
  const c = COPY[lang];
  const noteCopy = POPULAR_NOTE_COPY[lang];

  // Fetch featured products (Le Labo) from live API; fall back to empty list on failure.
  let featuredProducts: Card[] = [];
  try {
    const res = await listProducts({ locale, brand: 'le-labo' });
    featuredProducts = res.data;
  } catch {
    featuredProducts = [];
  }

  // Map translations for local slides
  const slides = [
    {
      image: '/slides/hero.png',
      tagline: b('tagline'),
      headline: t('hero.headline'),
      sub: t('hero.sub'),
      cta: t('hero.cta'),
      href: `/${locale}/catalog`
    },
    {
      image: '/slides/woody.png',
      tagline: c.slide2Tagline,
      headline: c.slide2Headline,
      sub: c.slide2Sub,
      cta: t('hero.cta'),
      href: `/${locale}/catalog?note=woody`
    }
  ];

  const popularNotes = (
    [
      { slug: 'sandalwood', image: '/notes/sandalwood.png', french: 'BOIS DE SANTAL' },
      { slug: 'rose', image: '/notes/rose.png', french: 'ROSE CRIMSOM' },
      { slug: 'bergamot', image: '/notes/bergamot.png', french: 'BERGAMOTE CITRON' },
      { slug: 'black-tea', image: '/notes/black-tea.png', french: 'THÉ NOIR FUMÉ' },
      { slug: 'vetiver', image: '/notes/vetiver.png', french: 'VÉTIVER RACINE' },
      { slug: 'musk', image: '/notes/musk.png', french: 'MUSC BLANC' },
    ] as const
  ).map((n) => ({
    ...n,
    name: noteCopy[n.slug]?.name ?? n.slug,
    descriptor: noteCopy[n.slug]?.descriptor ?? '',
  }));

  const popularBrands = [
    { name: 'Chanel', slug: 'chanel', desc: 'Paris' },
    { name: 'Dior', slug: 'dior', desc: 'Paris' },
    { name: 'Prada', slug: 'prada', desc: 'Milano' },
    { name: 'Gucci', slug: 'gucci', desc: 'Firenze' },
    { name: 'Givenchy', slug: 'givenchy', desc: 'Paris' },
    { name: 'Versace', slug: 'versace', desc: 'Milano' },
    { name: 'Tommy Hilfiger', slug: 'tommy-hilfiger', desc: 'New York' },
    { name: 'Chloé', slug: 'chloe', desc: 'Paris' }
  ];

  return (
    <>
      {/* Interactive Campaign Hero Slideshow */}
      <HeroSlider slides={slides} />

      {/* New Arrivals Section */}
      <section className="container py-24 border-b border-border bg-stone-50/50 dark:bg-stone-900/10">
        <div className="mb-12 flex items-baseline justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.3em] text-brass font-bold">
              {c.eyebrowNew}
            </span>
            <h2 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
              {t('sections.newArrivals')}
            </h2>
          </div>
          <Link 
            href={`/${locale}/catalog?sort=new`} 
            className="group text-xs uppercase tracking-widest text-ink-muted dark:text-stone-400 hover:text-brass transition-all flex items-center gap-1"
          >
            {c.viewAllNew}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {featuredProducts.map((prod) => (
            <ProductCard key={`new-${prod.id}`} product={prod} locale={locale} />
          ))}
        </div>
      </section>

      {/* Bestsellers Section */}
      <section className="container py-24 border-b border-border">
        <div className="mb-12 flex items-baseline justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.3em] text-brass font-bold">
              {c.eyebrowBest}
            </span>
            <h2 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
              {t('sections.bestsellers')}
            </h2>
          </div>
          <Link 
            href={`/${locale}/catalog?sort=bestsellers`} 
            className="group text-xs uppercase tracking-widest text-ink-muted dark:text-stone-400 hover:text-brass transition-all flex items-center gap-1"
          >
            {c.viewAllBest}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {[...featuredProducts].reverse().map((prod) => (
            <ProductCard key={`best-${prod.id}`} product={prod} locale={locale} />
          ))}
        </div>
      </section>

      {/* Fragrance Notes Grid Section */}
      <section className="container py-24 border-b border-border bg-stone-50/50 dark:bg-stone-900/10">
        <div className="mb-12 flex items-baseline justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.3em] text-brass font-bold">
              {c.eyebrowNotes}
            </span>
            <h2 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
              {t('sections.byNotes')}
            </h2>
          </div>
          <Link 
            href={`/${locale}/notes`} 
            className="group text-xs uppercase tracking-widest text-ink-muted dark:text-stone-400 hover:text-brass transition-all flex items-center gap-1"
          >
            {c.viewAllNotes}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {popularNotes.map((note) => (
            <Link
              key={note.slug}
              href={`/${locale}/catalog?note=${note.slug}`}
              className="relative overflow-hidden aspect-[3/4] border border-border/60 hover:border-brass/60 transition-colors duration-500 group cursor-pointer flex flex-col justify-end p-5"
            >
              {/* Note Image backdrop */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={note.image}
                  alt={note.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover filter grayscale group-hover:grayscale-0 scale-100 group-hover:scale-105 transition-all duration-700 ease-out"
                />
                {/* Premium dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1714] via-[#1A1714]/40 to-transparent opacity-85 group-hover:opacity-75 transition-opacity duration-500" />
              </div>

              {/* Stark elegant text layout */}
              <div className="relative z-10 flex flex-col text-left">
                <span className="text-[8px] font-mono tracking-[0.25em] text-[#8B6F47] dark:text-[#A88B5B] font-bold uppercase mb-1">
                  {note.french}
                </span>
                <span className="text-sm font-bold tracking-wider text-bone font-mono uppercase group-hover:text-brass transition-colors duration-300">
                  {note.name}
                </span>
                <span className="text-[9px] tracking-wide text-stone-400 mt-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  {note.descriptor}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Brands Grid Section */}
      <section className="container py-24">
        <div className="mb-12 flex items-baseline justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.3em] text-brass font-bold">
              {c.eyebrowBrands}
            </span>
            <h2 className="font-display text-4xl text-ink dark:text-bone md:text-5xl">
              {t('sections.byBrand')}
            </h2>
          </div>
          <Link 
            href={`/${locale}/brands`} 
            className="group text-xs uppercase tracking-widest text-ink-muted dark:text-stone-400 hover:text-brass transition-all flex items-center gap-1"
          >
            {c.viewAllBrands}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {popularBrands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/${locale}/catalog?brand=${brand.slug}`}
              className="flex flex-col p-8 bg-bone dark:bg-[#1A1714]/30 border border-border/80 items-center justify-center text-center group hover:border-brass/70 transition-all duration-300 hover:bg-stone-50 dark:hover:bg-[#1A1714]/60"
            >
              {/* Brand Logo Container */}
              <div className="w-full h-16 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
                {brand.slug === 'chanel' && (
                  <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-ink dark:text-bone fill-current transition-colors duration-300 group-hover:text-brass">
                    <text x="50%" y="38" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="23" letterSpacing="0.25em">CHANEL</text>
                  </svg>
                )}
                {brand.slug === 'dior' && (
                  <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-ink dark:text-bone fill-current transition-colors duration-300 group-hover:text-brass">
                    <text x="50%" y="38" textAnchor="middle" fontFamily="Georgia, serif" fontSize="26" fontWeight="500" letterSpacing="0.03em">Dior</text>
                  </svg>
                )}
                {brand.slug === 'prada' && (
                  <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-ink dark:text-bone fill-current transition-colors duration-300 group-hover:text-brass">
                    <g fill="currentColor">
                      {/* P */}
                      <path d="M 40 16 L 54 16 C 60 16 63 19 63 23 C 63 28 60 30 54 30 L 46 30 L 46 41 L 40 41 L 40 16 Z M 46 20 L 46 26 L 53 26 C 56 26 57.5 25 57.5 23 C 57.5 21 56 20 53 20 Z" />
                      {/* R - with the trademark detached leg */}
                      <path d="M 68 16 L 82 16 C 88 16 91 19 91 23.5 C 91 27.5 88.5 29.5 84 30 L 91.5 41 L 85.5 41 L 78.5 30.5 L 74 30.5 L 74 41 L 68 41 C 68 41 68 16 68 16 Z M 74 20 L 74 26.5 L 81.5 26.5 C 84 26.5 85 25.5 85 23.5 C 85 21.5 84 20.5 81.5 20.5 Z" />
                      {/* A */}
                      <path d="M 104.5 16 L 110.5 16 L 119.5 41 L 113.5 41 L 111.5 35 L 103.5 35 L 101.5 41 L 95.5 41 Z M 105 25 L 110 25 L 107.5 18 Z" />
                      {/* D */}
                      <path d="M 125 16 L 138 16 C 145 16 149 20 149 28.5 C 149 37 145 41 138 41 L 125 41 Z M 131 20 L 131 37 L 137 37 C 142 37 143 34 143 28.5 C 143 23 142 20 137 20 Z" />
                      {/* A */}
                      <path d="M 159.5 16 L 165.5 16 L 174.5 41 L 168.5 41 L 166.5 35 L 158.5 35 L 156.5 41 L 150.5 41 Z M 160 25 L 165 25 L 162.5 18 Z" />
                    </g>
                    <text x="50%" y="51" textAnchor="middle" fontFamily="sans-serif" fontSize="5" letterSpacing="0.4em" opacity="0.8">MILANO</text>
                  </svg>
                )}
                {brand.slug === 'gucci' && (
                  <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-ink dark:text-bone fill-current transition-colors duration-300 group-hover:text-brass">
                    <text x="50%" y="38" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="300" fontSize="21" letterSpacing="0.32em">GUCCI</text>
                  </svg>
                )}
                {brand.slug === 'givenchy' && (
                  <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-ink dark:text-bone fill-current transition-colors duration-300 group-hover:text-brass">
                    <text x="50%" y="38" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="19" letterSpacing="0.22em">GIVENCHY</text>
                  </svg>
                )}
                {brand.slug === 'versace' && (
                  <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-ink dark:text-bone fill-current transition-colors duration-300 group-hover:text-brass">
                    <text x="50%" y="38" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="22" letterSpacing="0.1em">VERSACE</text>
                  </svg>
                )}
                {brand.slug === 'tommy-hilfiger' && (
                  <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-ink dark:text-bone fill-current transition-colors duration-300">
                    <g fill="currentColor" className="group-hover:text-brass transition-colors duration-300">
                      <text x="45" y="38" fontSize="11" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.12em" textAnchor="end">TOMMY</text>
                      <text x="155" y="38" fontSize="11" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.12em" textAnchor="start">HILFIGER</text>
                    </g>
                    <rect x="85" y="24" width="30" height="17" fill="#0C1D33" />
                    <rect x="85" y="27" width="15" height="11" fill="white" />
                    <rect x="100" y="27" width="15" height="11" fill="#C8102E" />
                  </svg>
                )}
                {brand.slug === 'chloe' && (
                  <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-ink dark:text-bone fill-current transition-colors duration-300 group-hover:text-brass">
                    <text x="50%" y="38" textAnchor="middle" fontFamily="Georgia, serif" fontSize="25" fontWeight="500" letterSpacing="0.03em">Chloé</text>
                  </svg>
                )}
              </div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-ink-muted dark:text-stone-400 group-hover:text-brass transition-colors duration-300">
                {brand.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

