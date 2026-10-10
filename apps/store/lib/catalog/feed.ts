// The catalogue as a file other platforms can read: a YML feed (the Yandex
// Market format most marketplaces and price aggregators in the region accept)
// served at /feed.yml, and a CSV for uploading to a seller cabinet by hand —
// Uzum Market's import works from a spreadsheet.
//
// Building the text is pure (buildYml, buildCsv) so it is tested without a
// database; loadFeedItems is the one query.

import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { normalizeGender, toProductNote } from '@/lib/catalog/products';
import { describeProduct } from '@/lib/catalog/product-description';
import { toPyramidLayer, type Gender, type NotePyramidDTO } from '@/lib/catalog/types';

export interface FeedItem {
  id: number;
  slug: string;
  name: string;
  brand: string;
  price: number;
  images: string[];
  gender: Gender;
  concentration: string | null;
  volumeMl: number | null;
  description: string;
}

const GENDER_CATEGORY: Record<Gender, { id: number; ru: string; uz: string; en: string }> = {
  women: { id: 1, ru: 'Женская парфюмерия', uz: 'Ayollar atirlari', en: 'Women’s fragrance' },
  men: { id: 2, ru: 'Мужская парфюмерия', uz: 'Erkaklar atirlari', en: 'Men’s fragrance' },
  unisex: { id: 3, ru: 'Парфюмерия унисекс', uz: 'Uniseks atirlar', en: 'Unisex fragrance' },
};

const LABELS = {
  ru: { volume: 'Объём', concentration: 'Концентрация', ml: 'мл' },
  uz: { volume: 'Hajm', concentration: 'Konsentratsiya', ml: 'ml' },
  en: { volume: 'Volume', concentration: 'Concentration', ml: 'ml' },
} as const;

type FeedLocale = keyof typeof LABELS;
const toFeedLocale = (locale: string): FeedLocale =>
  locale === 'uz' || locale === 'en' ? locale : 'ru';

/** Active products with a price, newest first, ready for either format. */
export const loadFeedItems = async (locale: string): Promise<FeedItem[]> => {
  const rows = await db.product.findMany({
    where: { status: 'active', price: { gt: 0 } },
    orderBy: { id: 'desc' },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      images: { orderBy: { position: 'asc' }, take: 5, select: { url: true } },
      fragrance: {
        select: {
          gender: true,
          concentration: true,
          volumeMl: true,
          releaseYear: true,
          brand: { select: { name: true } },
        },
      },
      notes: {
        orderBy: { position: 'asc' },
        select: {
          pyramidLayer: true,
          note: { select: { slug: true, name: true, family: true, iconUrl: true } },
        },
      },
      perfumers: { select: { perfumer: { select: { slug: true, name: true } } } },
    },
  });

  return rows.map((row) => {
    const notes: NotePyramidDTO = { top: [], middle: [], base: [] };
    for (const pn of row.notes) {
      const layer = toPyramidLayer(pn.pyramidLayer);
      if (layer) notes[layer].push(toProductNote(pn.note, locale));
    }
    const name = resolveLocaleText(row.name, locale);
    const brand = row.fragrance?.brand?.name ?? '';
    const gender = normalizeGender(row.fragrance?.gender);
    return {
      id: row.id,
      slug: row.slug,
      name,
      brand,
      price: row.price,
      images: row.images.map((i) => i.url),
      gender,
      concentration: row.fragrance?.concentration ?? null,
      volumeMl: row.fragrance?.volumeMl ?? null,
      description: describeProduct(
        {
          name,
          brand,
          gender,
          release_year: row.fragrance?.releaseYear ?? null,
          notes,
          perfumers: row.perfumers.map((p) => ({ slug: p.perfumer.slug, name: p.perfumer.name })),
        },
        locale,
      ),
    };
  });
};

const xml = (value: string | number): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const absolute = (siteUrl: string, url: string): string =>
  /^https?:\/\//.test(url) ? url : `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`;

/** The feed in YML. `date` is when it was generated. */
export const buildYml = (
  items: readonly FeedItem[],
  opts: { siteUrl: string; locale: string; date: Date },
): string => {
  const lang = toFeedLocale(opts.locale);
  const labels = LABELS[lang];
  const categories = Object.values(GENDER_CATEGORY)
    .map((c) => `      <category id="${c.id}">${xml(c[lang])}</category>`)
    .join('\n');

  const offers = items
    .map((item) => {
      const lines = [
        `      <offer id="${item.id}" available="true">`,
        `        <url>${xml(`${opts.siteUrl}/${lang}/product/${item.slug}`)}</url>`,
        `        <price>${item.price}</price>`,
        `        <currencyId>UZS</currencyId>`,
        `        <categoryId>${GENDER_CATEGORY[item.gender].id}</categoryId>`,
        ...item.images.map(
          (src) => `        <picture>${xml(absolute(opts.siteUrl, src))}</picture>`,
        ),
        `        <name>${xml(item.brand ? `${item.brand} ${item.name}` : item.name)}</name>`,
        ...(item.brand ? [`        <vendor>${xml(item.brand)}</vendor>`] : []),
        `        <description>${xml(item.description)}</description>`,
        ...(item.volumeMl
          ? [
              `        <param name="${xml(labels.volume)}" unit="${labels.ml}">${item.volumeMl}</param>`,
            ]
          : []),
        ...(item.concentration
          ? [
              `        <param name="${xml(labels.concentration)}">${xml(item.concentration)}</param>`,
            ]
          : []),
        `      </offer>`,
      ];
      return lines.join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<yml_catalog date="${opts.date.toISOString()}">`,
    '  <shop>',
    '    <name>Labor</name>',
    '    <company>Labor</company>',
    `    <url>${xml(opts.siteUrl)}</url>`,
    '    <currencies>',
    '      <currency id="UZS" rate="1"/>',
    '    </currencies>',
    '    <categories>',
    categories,
    '    </categories>',
    '    <offers>',
    offers,
    '    </offers>',
    '  </shop>',
    '</yml_catalog>',
    '',
  ].join('\n');
};

const csvCell = (value: string | number | null): string => {
  const text = value === null ? '' : String(value);
  // Quote everything; a leading = + - @ is neutralised so a spreadsheet never
  // runs a product name as a formula.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** The feed as CSV (UTF-8 with BOM so Excel opens Cyrillic correctly). */
export const buildCsv = (
  items: readonly FeedItem[],
  opts: { siteUrl: string; locale: string },
): string => {
  const lang = toFeedLocale(opts.locale);
  const header = [
    'id',
    'sku',
    'name',
    'brand',
    'category',
    'price_uzs',
    'volume_ml',
    'concentration',
    'description',
    'image_1',
    'image_2',
    'image_3',
    'url',
  ];
  const rows = items.map((item) =>
    [
      item.id,
      item.slug,
      item.brand ? `${item.brand} ${item.name}` : item.name,
      item.brand,
      GENDER_CATEGORY[item.gender][lang],
      item.price,
      item.volumeMl,
      item.concentration,
      item.description,
      item.images[0] ? absolute(opts.siteUrl, item.images[0]) : '',
      item.images[1] ? absolute(opts.siteUrl, item.images[1]) : '',
      item.images[2] ? absolute(opts.siteUrl, item.images[2]) : '',
      `${opts.siteUrl}/${lang}/product/${item.slug}`,
    ]
      .map(csvCell)
      .join(','),
  );
  return `﻿${[header.map(csvCell).join(','), ...rows].join('\r\n')}\r\n`;
};
