import Image from 'next/image';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { locales, type Locale } from '@/i18n/config';
import { Hero } from '@/components/home/hero';
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

// Section eyebrows + "view all" labels, per locale. Component-local (not in
// next-intl catalogs) to match the apps/web homepage convention.
type HomeCopy = {
  eyebrowNew: string;
  eyebrowNotes: string;
  eyebrowBrands: string;
  emptyProducts: string;
  emptyNotes: string;
  emptyBrands: string;
  viewAllNew: string;
  viewAllNotes: string;
  viewAllBrands: string;
};

const COPY: Record<Lang, HomeCopy> = {
  ru: {
    eyebrowNew: 'Свежие поступления',
    eyebrowNotes: 'Парфюмерные ингредиенты',
    eyebrowBrands: 'Официальный дистрибьютор',
    emptyProducts: 'Скоро здесь появятся ароматы',
    emptyNotes: 'Ноты скоро появятся',
    emptyBrands: 'Бренды скоро появятся',
    viewAllNew: 'Все новинки',
    viewAllNotes: 'Все ноты',
    viewAllBrands: 'Все бренды',
  },
  en: {
    eyebrowNew: 'Just blended',
    eyebrowNotes: 'Olfactive pyramid',
    eyebrowBrands: 'Niche houses',
    emptyProducts: 'Fragrances are on their way',
    emptyNotes: 'Notes coming soon',
    emptyBrands: 'Brands coming soon',
    viewAllNew: 'View all',
    viewAllNotes: 'Browse notes',
    viewAllBrands: 'All brands',
  },
  uz: {
    eyebrowNew: 'Yangi tushganlar',
    eyebrowNotes: 'Parfyumeriya ingredientlari',
    eyebrowBrands: 'Rasmiy distribyutor',
    emptyProducts: 'Tez orada hidlar paydo boʻladi',
    emptyNotes: 'Notalar tez orada',
    emptyBrands: 'Brendlar tez orada',
    viewAllNew: 'Barcha yangiliklar',
    viewAllNotes: 'Barcha notalar',
    viewAllBrands: 'Barcha brendlar',
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
const NOTE_IMAGE_SLUGS = [
  'sandalwood',
  'rose',
  'bergamot',
  'black-tea',
  'vetiver',
  'musk',
] as const;

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const b = await getTranslations('brand');
  const lang = toLang(locale);
  const c = COPY[lang];

  // ── data-access layer: called directly from the RSC, no HTTP hop ──────────────
  const [newRes, notes, brands] = await Promise.all([
    listProducts({ locale, sort: 'new' }),
    getNotes(locale),
    getBrands(locale),
  ]);

  // "Few things visible at once." The shop's island carries 84 testers in seven
  // blocks; the home page carries twelve. Depth still exists — it sits behind
  // "view all", the way the archive drawers sit under the island. The catalog
  // page keeps its full PAGE_SIZE: that is a filtered, sequential surface where
  // quantity is coverage, not noise.
  const HOME_GRID = 12;

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

  return (
    <>
      {/* One object, one sentence, one action — no slideshow, no client island */}
      <Hero
        image="/slides/hero.png"
        tagline={b('tagline')}
        headline={t('hero.headline')}
        sub={t('hero.sub')}
        cta={t('hero.cta')}
        href={`/${locale}/catalog`}
        code={`LABOR / ${locale.toUpperCase()} — ${HOME_GRID} SELECTED`}
      />

      {/* New arrivals — listProducts({ sort:'new' }) */}
      <ProductGrid
        eyebrow={c.eyebrowNew}
        title={t('sections.newArrivals')}
        products={newRes.data.slice(0, HOME_GRID)}
        locale={locale}
        viewAllLabel={c.viewAllNew}
        viewAllHref={`/${locale}/catalog?sort=new`}
        emptyLabel={c.emptyProducts}
      />

      {/* Shop by mood (static; tiles map to live /catalog?note= slugs) */}
      <MoodBrowser locale={locale} lang={lang} />

      {/* Fragrance notes — getNotes(locale) ∩ shipped art */}
      <section className="border-border container border-b bg-stone-50/50 py-24 dark:bg-stone-900/10">
        <div className="mb-12 flex items-baseline justify-between">
          <div className="space-y-1">
            <span className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
              {c.eyebrowNotes}
            </span>
            <h2 className="font-display text-ink dark:text-bone text-4xl md:text-5xl">
              {t('sections.byNotes')}
            </h2>
          </div>
          <Link
            href={`/${locale}/notes`}
            className="group text-ink-muted hover:text-foreground flex items-center gap-1 text-xs tracking-widest uppercase transition-all dark:text-stone-400"
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
                className="group border-border hover:border-foreground focus-visible:outline-graphite dark:focus-visible:outline-offwhite flex flex-col border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {/* Ingredient inside the frame, name below it — the same card
                    the product grid uses, so the page keeps one surface. */}
                <div className="border-border relative aspect-square w-full border-b">
                  <Image
                    src={note.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <span className="text-muted-foreground text-micro font-mono tracking-[0.2em] uppercase">
                    {note.french}
                  </span>
                  <span className="text-sm font-semibold tracking-[-0.01em]">{note.name}</span>
                  {note.family && (
                    <span className="text-muted-foreground text-micro font-mono tracking-[0.12em] uppercase">
                      {note.family}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-ink-muted py-10 text-center text-sm dark:text-stone-400">
            {c.emptyNotes}
          </p>
        )}
      </section>

      {/* Brands — getBrands(locale), elegant data-driven text cards */}
      <section className="container py-24">
        <div className="mb-12 flex items-baseline justify-between">
          <div className="space-y-1">
            <span className="text-muted-foreground text-micro font-mono tracking-[0.28em] uppercase">
              {c.eyebrowBrands}
            </span>
            <h2 className="font-display text-ink dark:text-bone text-4xl md:text-5xl">
              {t('sections.byBrand')}
            </h2>
          </div>
          <Link
            href={`/${locale}/brands`}
            className="group text-ink-muted hover:text-foreground flex items-center gap-1 text-xs tracking-widest uppercase transition-all dark:text-stone-400"
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
                className="group border-border/80 bg-bone hover:border-foreground dark:bg-graphite/30 dark:hover:bg-graphite/60 flex flex-col items-center justify-center border p-8 text-center transition-all duration-300 hover:bg-stone-50"
              >
                <span className="mb-4 flex h-16 w-full items-center justify-center text-2xl font-semibold tracking-[-0.01em] transition-colors duration-300 group-hover:underline group-hover:underline-offset-4">
                  {brand.name}
                </span>
                <p className="text-muted-foreground group-hover:text-foreground text-micro font-mono tracking-[0.2em] uppercase transition-colors">
                  {brand.country ?? (brand.niche ? 'Niche' : ' ')}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-ink-muted py-10 text-center text-sm dark:text-stone-400">
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
