import { describe, expect, it } from 'vitest';

import { buildCsv, buildYml, type FeedItem } from './feed';

const item = (over: Partial<FeedItem> = {}): FeedItem => ({
  id: 7,
  slug: 'oud-royal',
  name: 'Oud Royal',
  brand: 'Atelier Noir',
  price: 160_000,
  images: ['/storage/a.jpg', 'https://cdn.example/b.jpg'],
  gender: 'unisex',
  concentration: 'EDP',
  volumeMl: 10,
  description: 'Восточный аромат <с> "удом" & розой.',
  ...over,
});

const site = 'https://laborparfum.com';

describe('buildYml', () => {
  const yml = buildYml([item()], {
    siteUrl: site,
    locale: 'ru',
    date: new Date('2026-10-10T00:00:00Z'),
  });

  it('writes an offer in UZS with absolute links and pictures', () => {
    expect(yml).toContain('<yml_catalog date="2026-10-10T00:00:00.000Z">');
    expect(yml).toContain('<currency id="UZS" rate="1"/>');
    expect(yml).toContain('<offer id="7" available="true">');
    expect(yml).toContain('<url>https://laborparfum.com/ru/product/oud-royal</url>');
    expect(yml).toContain('<price>160000</price>');
    expect(yml).toContain('<picture>https://laborparfum.com/storage/a.jpg</picture>');
    expect(yml).toContain('<picture>https://cdn.example/b.jpg</picture>');
    expect(yml).toContain('<vendor>Atelier Noir</vendor>');
    expect(yml).toContain('<param name="Объём" unit="мл">10</param>');
    expect(yml).toContain('<categoryId>3</categoryId>');
  });

  it('escapes text so a description cannot break the XML', () => {
    expect(yml).toContain(
      '<description>Восточный аромат &lt;с&gt; &quot;удом&quot; &amp; розой.</description>',
    );
  });

  it('uses the requested language for labels and links', () => {
    const uz = buildYml([item()], { siteUrl: site, locale: 'uz', date: new Date() });
    expect(uz).toContain('/uz/product/oud-royal');
    expect(uz).toContain('<param name="Hajm" unit="ml">10</param>');
  });

  it('leaves out what a product does not have', () => {
    const bare = buildYml([item({ brand: '', volumeMl: null, concentration: null, images: [] })], {
      siteUrl: site,
      locale: 'ru',
      date: new Date(),
    });
    expect(bare).not.toContain('<vendor>');
    expect(bare).not.toContain('<param');
    expect(bare).not.toContain('<picture>');
  });
});

describe('buildCsv', () => {
  it('starts with a BOM and a header, one quoted row per product', () => {
    const csv = buildCsv([item()], { siteUrl: site, locale: 'ru' });
    const [header, row] = csv.replace('﻿', '').trim().split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(header).toContain('"price_uzs"');
    expect(row).toContain('"Atelier Noir Oud Royal"');
    expect(row).toContain('"160000"');
    expect(row).toContain('"Восточный аромат <с> ""удом"" & розой."');
  });

  it('neutralises spreadsheet formulas', () => {
    const csv = buildCsv([item({ name: '=HYPERLINK("x")', brand: '' })], {
      siteUrl: site,
      locale: 'ru',
    });
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
