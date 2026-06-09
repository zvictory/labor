import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageIntro } from '@/components/page-intro';
import { getBrands, type BrandSummary } from '@/lib/api/brands';
import { LOGO_FILES } from './logo-manifest';
import { FallbackImage } from '@/components/fallback-image';

interface Props {
  params: Promise<{ locale: string }>;
}

type Lang = 'en' | 'ru' | 'uz';
const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz'];
const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'ru';

const EYEBROW: Record<Lang, string> = {
  ru: 'КУРАТОРЫ ХОРОШЕГО ВКУСА',
  en: 'CURATORS OF OLFACTORY ART',
  uz: 'DID KURATORLARI',
};

const BrandLogo = ({
  slug,
  name,
  logoUrl,
}: {
  slug: string;
  name: string;
  logoUrl?: string | null;
}) => {
  const svgCls =
    'w-full text-ink dark:text-bone fill-current transition-colors duration-300 group-hover:text-brass';

  // Standard elegant vector logo fallback or text badge if not defined
  const defaultFallback = (() => {
    switch (slug) {
      case 'chanel':
        return (
          <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={svgCls}>
            <text
              x="50%"
              y="38"
              textAnchor="middle"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="700"
              fontSize="23"
              letterSpacing="0.25em"
            >
              CHANEL
            </text>
          </svg>
        );
      case 'dior':
        return (
          <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={svgCls}>
            <text
              x="50%"
              y="38"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="26"
              fontWeight="500"
              letterSpacing="0.03em"
            >
              Dior
            </text>
          </svg>
        );
      case 'prada':
        return (
          <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={svgCls}>
            <g fill="currentColor">
              <path d="M 40 16 L 54 16 C 60 16 63 19 63 23 C 63 28 60 30 54 30 L 46 30 L 46 41 L 40 41 L 40 16 Z M 46 20 L 46 26 L 53 26 C 56 26 57.5 25 57.5 23 C 57.5 21 56 20 53 20 Z" />
              <path d="M 68 16 L 82 16 C 88 16 91 19 91 23.5 C 91 27.5 88.5 29.5 84 30 L 91.5 41 L 85.5 41 L 78.5 30.5 L 74 30.5 L 74 41 L 68 41 C 68 41 68 16 68 16 Z M 74 20 L 74 26.5 L 81.5 26.5 C 84 26.5 85 25.5 85 23.5 C 85 21.5 84 20.5 81.5 20.5 Z" />
              <path d="M 104.5 16 L 110.5 16 L 119.5 41 L 113.5 41 L 111.5 35 L 103.5 35 L 101.5 41 L 95.5 41 Z M 105 25 L 110 25 L 107.5 18 Z" />
              <path d="M 125 16 L 138 16 C 145 16 149 20 149 28.5 C 149 37 145 41 138 41 L 125 41 Z M 131 20 L 131 37 L 137 37 C 142 37 143 34 143 28.5 C 143 23 142 20 137 20 Z" />
              <path d="M 159.5 16 L 165.5 16 L 174.5 41 L 168.5 41 L 166.5 35 L 158.5 35 L 156.5 41 L 150.5 41 Z M 160 25 L 165 25 L 162.5 18 Z" />
            </g>
            <text
              x="50%"
              y="51"
              textAnchor="middle"
              fontFamily="sans-serif"
              fontSize="5"
              letterSpacing="0.4em"
              opacity="0.8"
            >
              MILANO
            </text>
          </svg>
        );
      case 'gucci':
        return (
          <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={svgCls}>
            <text
              x="50%"
              y="38"
              textAnchor="middle"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="300"
              fontSize="21"
              letterSpacing="0.32em"
            >
              GUCCI
            </text>
          </svg>
        );
      case 'givenchy':
        return (
          <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={svgCls}>
            <text
              x="50%"
              y="38"
              textAnchor="middle"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="700"
              fontSize="19"
              letterSpacing="0.22em"
            >
              GIVENCHY
            </text>
          </svg>
        );
      case 'versace':
        return (
          <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={svgCls}>
            <text
              x="50%"
              y="38"
              textAnchor="middle"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="800"
              fontSize="22"
              letterSpacing="0.1em"
            >
              VERSACE
            </text>
          </svg>
        );
      case 'tommy-hilfiger':
        return (
          <svg
            viewBox="0 0 200 65"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-ink dark:text-bone w-full fill-current transition-colors duration-300"
          >
            <g fill="currentColor" className="group-hover:text-brass transition-colors duration-300">
              <text
                x="45"
                y="38"
                fontSize="11"
                fontWeight="800"
                fontFamily="system-ui, -apple-system, sans-serif"
                letterSpacing="0.12em"
                textAnchor="end"
              >
                TOMMY
              </text>
              <text
                x="155"
                y="38"
                fontSize="11"
                fontWeight="800"
                fontFamily="system-ui, -apple-system, sans-serif"
                letterSpacing="0.12em"
                textAnchor="start"
              >
                HILFIGER
              </text>
            </g>
            <rect x="85" y="24" width="30" height="17" fill="#0C1D33" />
            <rect x="85" y="27" width="15" height="11" fill="white" />
            <rect x="100" y="27" width="15" height="11" fill="#C8102E" />
          </svg>
        );
      case 'chloe':
        return (
          <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={svgCls}>
            <text
              x="50%"
              y="38"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="25"
              fontWeight="500"
              letterSpacing="0.03em"
            >
              Chloé
            </text>
          </svg>
        );
      case 'le-labo':
        return (
          <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={svgCls}>
            <rect
              x="35"
              y="16"
              width="130"
              height="32"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 2"
              fill="none"
              opacity="0.6"
            />
            <text
              x="50%"
              y="38"
              textAnchor="middle"
              fontFamily="Courier New, Courier, monospace"
              fontWeight="bold"
              fontSize="18"
              letterSpacing="0.08em"
            >
              LE LABO
            </text>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={svgCls}>
            <text
              x="50%"
              y="38"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="22"
              fontWeight="500"
              letterSpacing="0.05em"
            >
              {name}
            </text>
          </svg>
        );
    }
  })();

  if (logoUrl) {
    return (
      <div className="w-full dark:rounded-xl dark:bg-white/95 dark:px-2 dark:shadow-sm">
        <FallbackImage
          src={logoUrl}
          alt={name}
          width={400}
          height={130}
          className="h-auto w-full object-contain [mix-blend-mode:multiply] dark:[mix-blend-mode:normal]"
          unoptimized
          fallback={defaultFallback}
        />
      </div>
    );
  }

  const file = LOGO_FILES[slug];
  if (file) {
    return (
      <FallbackImage
        src={`/brands/${file}`}
        alt={name}
        width={400}
        height={130}
        className="h-auto w-full object-contain dark:brightness-95 dark:invert"
        unoptimized={file.endsWith('.svg')}
        fallback={defaultFallback}
      />
    );
  }

  return defaultFallback;
};

export default async function BrandsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('brands');
  const lang = toLang(locale);

  let brands: BrandSummary[] = [];
  let errorMessage: string | null = null;
  try {
    brands = await getBrands(locale);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-4 md:py-6">
      <PageIntro
        eyebrow={EYEBROW[lang]}
        title={t('title')}
        lead={t('subtitle')}
        action={
          <Link
            href={`/${locale}/catalog-map`}
            className="border-brass/40 text-brass hover:bg-brass hover:text-bone inline-flex rounded-full border px-4 py-2 text-[10px] font-bold tracking-[0.24em] uppercase transition-colors"
          >
            Catalog map
          </Link>
        }
      />

      {errorMessage && process.env.NODE_ENV !== 'production' && (
        <div className="mx-auto max-w-2xl rounded-md border border-amber-400/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="mb-1 font-mono text-xs tracking-widest uppercase">{t('errorLoading')}</p>
          <p className="font-mono text-xs break-all">{errorMessage}</p>
        </div>
      )}

      {brands.length === 0 && !errorMessage && (
        <p className="text-ink-muted text-center text-sm dark:text-stone-400">{t('empty')}</p>
      )}

      {brands.length > 0 && (
        <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {brands.map((brand) => (
            <li key={brand.slug} className="mb-4 break-inside-avoid">
              <Link
                href={`/${locale}/catalog?brand=${brand.slug}`}
                className="bg-bone border-border/80 group hover:border-brass/70 relative block overflow-hidden rounded-xl border p-5 transition-all duration-500 hover:bg-stone-50 dark:bg-[#1A1714]/30 dark:hover:bg-[#1A1714]/60"
              >
                <span className="group-hover:bg-brass/20 group-hover:text-brass absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-stone-200/80 font-mono text-[9px] font-bold text-stone-500 transition-colors dark:bg-stone-700/60 dark:text-stone-400">
                  {brand.product_count}
                </span>

                <div className="w-full px-2 transition-transform duration-500 group-hover:scale-105">
                  <BrandLogo slug={brand.slug} name={brand.name} logoUrl={brand.logo_url ?? null} />
                </div>

                <div className="bg-brass absolute inset-x-0 bottom-0 h-[2px] scale-x-0 transform transition-transform duration-500 group-hover:scale-x-100" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
