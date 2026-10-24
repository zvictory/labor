// Search metadata shared by the storefront pages, the sitemap and robots.txt.
//
// Every page is served under all three locales, so every page must say which
// URL is its own and where its siblings live. Without that a search engine
// sees /ru/x, /uz/x and /en/x as three copies of one page and picks a winner
// at random — usually not the Uzbek one a buyer in Samarkand searched in.

import type { Metadata } from 'next';

import { defaultLocale, locales, type Locale } from '@/i18n/config';
import type { ProductDetailDTO } from '@/lib/catalog/types';
import type { RatingSummary } from '@/lib/reviews/reviews';

/** Public origin, no trailing slash. The production image is built with NEXT_PUBLIC_APP_URL. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  'https://laborparfum.com'
).replace(/\/+$/, '');

export const SITE_NAME = 'Labor';

const OG_LOCALE: Record<Locale, string> = {
  ru: 'ru_RU',
  uz: 'uz_UZ',
  en: 'en_US',
};

/** An absolute URL for a path or an already-absolute URL. */
export const absoluteUrl = (pathOrUrl: string): string =>
  /^https?:\/\//.test(pathOrUrl)
    ? pathOrUrl
    : `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;

/**
 * Canonical URL plus one hreflang alternate per locale for a locale-less path
 * such as `/catalog` or `/product/aventus` (`''` is the home page).
 */
export const localeAlternates = (
  locale: string,
  path: string,
): { canonical: string; languages: Record<string, string> } => {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = absoluteUrl(`/${l}${path}`);
  languages['x-default'] = absoluteUrl(`/${defaultLocale}${path}`);
  return { canonical: absoluteUrl(`/${locale}${path}`), languages };
};

type PageMetadataInput = {
  locale: string;
  /** Locale-less path, e.g. `/catalog`; `''` for the home page. */
  path: string;
  title: string;
  description?: string;
  images?: string[];
  /** Pages with no search value of their own (search results, carts). */
  noindex?: boolean;
  /** Use the title as is, without the `· Labor` suffix from the root layout. */
  absoluteTitle?: boolean;
};

export const pageMetadata = ({
  locale,
  path,
  title,
  description,
  images,
  noindex,
  absoluteTitle,
}: PageMetadataInput): Metadata => {
  const alternates = localeAlternates(locale, path);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates,
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url: alternates.canonical,
      locale: OG_LOCALE[locale as Locale] ?? OG_LOCALE[defaultLocale],
      images: images?.filter(Boolean).map(absoluteUrl),
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
};

type ProductForJsonLd = Pick<
  ProductDetailDTO,
  'slug' | 'name' | 'brand' | 'price' | 'image' | 'images'
>;

/**
 * schema.org Product for the product page, so a search result can show the
 * price and rating. The rating is Labor's own buyers' (lib/reviews), and only
 * when there is one. The stars in the product record are Fragrantica's votes,
 * imported, and Google's review-snippet rules forbid marking up ratings
 * collected on another site, so those never go in.
 */
export const productJsonLd = (
  product: ProductForJsonLd,
  locale: string,
  description: string,
  ownRating?: RatingSummary,
): Record<string, unknown> => {
  const url = absoluteUrl(`/${locale}/product/${product.slug}`);
  const images = (product.images.length > 0 ? product.images : [product.image])
    .filter(Boolean)
    .map(absoluteUrl);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    url,
    ...(images.length > 0 ? { image: images } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    offers: {
      '@type': 'Offer',
      url,
      price: product.price,
      priceCurrency: 'UZS',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
    ...(ownRating && ownRating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: ownRating.average,
            ratingCount: ownRating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
};

/**
 * Serialise JSON-LD for a <script> tag. `<` is escaped so a product name can
 * never close the script element early.
 */
export const jsonLdScript = (data: Record<string, unknown> | Record<string, unknown>[]): string =>
  JSON.stringify(data).replace(/</g, '\\u003c');
