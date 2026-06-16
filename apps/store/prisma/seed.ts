/**
 * Sample seed for local demo — lets `npm run dev` show a populated storefront
 * WITHOUT the full Spree ETL. Idempotent (upsert by slug); safe to re-run.
 * Real catalog + product imagery come from scripts/etl/* against the Spree DB.
 *
 * Run: npx prisma db seed   (configured in package.json), or: npx tsx prisma/seed.ts
 */
import { PrismaClient, type Prisma } from '@prisma/client';

const db = new PrismaClient();

type L = { ru: string; uz?: string; en?: string };
const j = (v: L): Prisma.InputJsonValue => v as unknown as Prisma.InputJsonValue;

const BRANDS = [
  { slug: 'atelier-noir', name: 'Atelier Noir', country: 'France', niche: true,
    description: { ru: 'Парижский нишевый дом тёмных восточных композиций.', uz: 'Parijlik nicha uy.', en: 'A Parisian niche house of dark orientals.' } },
  { slug: 'maison-vela', name: 'Maison Vela', country: 'France', niche: true,
    description: { ru: 'Чистые, минималистичные ароматы.', uz: 'Toza, minimalistik hidlar.', en: 'Clean, minimalist scents.' } },
  { slug: 'kora-lab', name: 'Kora Lab', country: 'Uzbekistan', niche: true,
    description: { ru: 'Ташкентская лаборатория ароматов.', uz: 'Toshkent hidlar laboratoriyasi.', en: 'A Tashkent fragrance laboratory.' } },
];

const NOTES = [
  { slug: 'bergamot', name: { ru: 'Бергамот', uz: 'Bergamot', en: 'Bergamot' }, family: 'citrus', iconUrl: '/notes/bergamot.png' },
  { slug: 'rose', name: { ru: 'Роза', uz: 'Atirgul', en: 'Rose' }, family: 'floral', iconUrl: '/notes/rose.png' },
  { slug: 'musk', name: { ru: 'Мускус', uz: 'Mushk', en: 'Musk' }, family: 'musky', iconUrl: '/notes/musk.png' },
  { slug: 'sandalwood', name: { ru: 'Сандал', uz: 'Sandal', en: 'Sandalwood' }, family: 'woody', iconUrl: '/notes/sandalwood.png' },
  { slug: 'vetiver', name: { ru: 'Ветивер', uz: 'Vetiver', en: 'Vetiver' }, family: 'woody', iconUrl: '/notes/vetiver.png' },
  { slug: 'black-tea', name: { ru: 'Чёрный чай', uz: 'Qora choy', en: 'Black tea' }, family: 'aromatic', iconUrl: '/notes/black-tea.png' },
  { slug: 'oud', name: { ru: 'Уд', uz: 'Ud', en: 'Oud' }, family: 'woody', iconUrl: null },
  { slug: 'vanilla', name: { ru: 'Ваниль', uz: 'Vanil', en: 'Vanilla' }, family: 'gourmand', iconUrl: null },
  { slug: 'amber', name: { ru: 'Амбра', uz: 'Ambra', en: 'Amber' }, family: 'oriental', iconUrl: null },
  { slug: 'jasmine', name: { ru: 'Жасмин', uz: 'Yasemin', en: 'Jasmine' }, family: 'floral', iconUrl: null },
  { slug: 'saffron', name: { ru: 'Шафран', uz: "Za'faron", en: 'Saffron' }, family: 'spicy', iconUrl: null },
  { slug: 'leather', name: { ru: 'Кожа', uz: 'Teri', en: 'Leather' }, family: 'leather', iconUrl: null },
];

const ACCORDS = [
  { slug: 'woody', name: { ru: 'Древесный', uz: "Yog'ochli", en: 'Woody' }, colorHex: '#6b4f3a' },
  { slug: 'floral', name: { ru: 'Цветочный', uz: 'Gulli', en: 'Floral' }, colorHex: '#c98b93' },
  { slug: 'fresh', name: { ru: 'Свежий', uz: 'Yangi', en: 'Fresh' }, colorHex: '#7a8a5e' },
  { slug: 'oriental', name: { ru: 'Восточный', uz: 'Sharqona', en: 'Oriental' }, colorHex: '#bd8a4a' },
  { slug: 'gourmand', name: { ru: 'Гурманский', uz: 'Gurman', en: 'Gourmand' }, colorHex: '#d8b878' },
  { slug: 'leather', name: { ru: 'Кожаный', uz: 'Teri', en: 'Leather' }, colorHex: '#7a5230' },
];

const PERFUMERS = [
  { slug: 'a-leduc', name: 'Antoine Leduc', country: 'France', bio: { ru: 'Парфюмер тёплых восточных композиций.', en: 'A perfumer of warm orientals.' } },
  { slug: 'd-rashidova', name: 'Dilnoza Rashidova', country: 'Uzbekistan', bio: { ru: 'Создаёт чистые современные ароматы.', en: 'Creates clean modern scents.' } },
];

type ProductSeed = {
  slug: string; name: L; description: L; price: number; brand: string;
  gender: string; concentration: string; releaseYear: number; avgRating: number; reviewsCount: number;
  notes: { slug: string; layer: 'top' | 'middle' | 'base' }[];
  accords: { slug: string; weight: number }[];
  perfumer?: string;
};

const PRODUCTS: ProductSeed[] = [
  { slug: 'oud-royal', name: { ru: 'Oud Royal', en: 'Oud Royal' }, description: { ru: 'Дымный уд на подушке из розы и амбры.', uz: 'Atirgul va ambra ustidagi tutunli ud.', en: 'Smoky oud on a bed of rose and amber.' },
    price: 2150000, brand: 'atelier-noir', gender: 'unisex', concentration: 'EDP', releaseYear: 2022, avgRating: 8.4, reviewsCount: 64, perfumer: 'a-leduc',
    notes: [{ slug: 'bergamot', layer: 'top' }, { slug: 'rose', layer: 'middle' }, { slug: 'saffron', layer: 'middle' }, { slug: 'oud', layer: 'base' }, { slug: 'amber', layer: 'base' }],
    accords: [{ slug: 'oriental', weight: 90 }, { slug: 'woody', weight: 70 }, { slug: 'floral', weight: 40 }] },
  { slug: 'blanc-papier', name: { ru: 'Blanc Papier', en: 'Blanc Papier' }, description: { ru: 'Чистая кожа и тёплая бумага. Минимализм как роскошь.', uz: 'Toza teri va iliq qogʻoz.', en: 'Clean skin and warm paper. Minimalism as luxury.' },
    price: 1340000, brand: 'maison-vela', gender: 'unisex', concentration: 'EDP', releaseYear: 2021, avgRating: 7.9, reviewsCount: 41, perfumer: 'd-rashidova',
    notes: [{ slug: 'bergamot', layer: 'top' }, { slug: 'jasmine', layer: 'middle' }, { slug: 'musk', layer: 'base' }],
    accords: [{ slug: 'fresh', weight: 80 }, { slug: 'floral', weight: 45 }] },
  { slug: 'rose-cendre', name: { ru: 'Rose Cendré', en: 'Rose Cendré' }, description: { ru: 'Роза в пепле и тёплый мускус. Романтика без сладости.', en: 'Rose in ash and warm musk.' },
    price: 1680000, brand: 'atelier-noir', gender: 'women', concentration: 'EDP', releaseYear: 2020, avgRating: 8.1, reviewsCount: 58,
    notes: [{ slug: 'bergamot', layer: 'top' }, { slug: 'rose', layer: 'middle' }, { slug: 'jasmine', layer: 'middle' }, { slug: 'musk', layer: 'base' }, { slug: 'amber', layer: 'base' }],
    accords: [{ slug: 'floral', weight: 90 }, { slug: 'oriental', weight: 50 }] },
  { slug: 'vetiver-brut', name: { ru: 'Vetiver Brut', en: 'Vetiver Brut' }, description: { ru: 'Зелёный ветивер и цитрус. Земля после дождя.', en: 'Green vetiver and citrus.' },
    price: 1490000, brand: 'kora-lab', gender: 'men', concentration: 'EDT', releaseYear: 2023, avgRating: 7.6, reviewsCount: 33, perfumer: 'd-rashidova',
    notes: [{ slug: 'bergamot', layer: 'top' }, { slug: 'vetiver', layer: 'middle' }, { slug: 'musk', layer: 'base' }],
    accords: [{ slug: 'woody', weight: 85 }, { slug: 'fresh', weight: 60 }] },
  { slug: 'ambre-prive', name: { ru: 'Ambre Privé', en: 'Ambre Privé' }, description: { ru: 'Густая амбра, ваниль и капля уда.', en: 'Thick amber, vanilla and a drop of oud.' },
    price: 2390000, brand: 'maison-vela', gender: 'unisex', concentration: 'Extrait', releaseYear: 2019, avgRating: 8.7, reviewsCount: 77,
    notes: [{ slug: 'bergamot', layer: 'top' }, { slug: 'amber', layer: 'middle' }, { slug: 'vanilla', layer: 'base' }, { slug: 'oud', layer: 'base' }],
    accords: [{ slug: 'oriental', weight: 95 }, { slug: 'gourmand', weight: 55 }] },
  { slug: 'the-noir', name: { ru: 'Thé Noir', en: 'Thé Noir' }, description: { ru: 'Чёрный чай и сандал. Тихий, умный, на каждый день.', en: 'Black tea and sandalwood.' },
    price: 1560000, brand: 'kora-lab', gender: 'unisex', concentration: 'EDP', releaseYear: 2023, avgRating: 7.4, reviewsCount: 29,
    notes: [{ slug: 'bergamot', layer: 'top' }, { slug: 'black-tea', layer: 'middle' }, { slug: 'sandalwood', layer: 'base' }, { slug: 'musk', layer: 'base' }],
    accords: [{ slug: 'woody', weight: 70 }, { slug: 'fresh', weight: 50 }] },
  { slug: 'cuir-fume', name: { ru: 'Cuir Fumé', en: 'Cuir Fumé' }, description: { ru: 'Дымная кожа и смола. Чёрный галстук в виде аромата.', en: 'Smoky leather and resin.' },
    price: 2050000, brand: 'atelier-noir', gender: 'men', concentration: 'EDP', releaseYear: 2021, avgRating: 8.0, reviewsCount: 38, perfumer: 'a-leduc',
    notes: [{ slug: 'bergamot', layer: 'top' }, { slug: 'leather', layer: 'middle' }, { slug: 'oud', layer: 'base' }, { slug: 'amber', layer: 'base' }],
    accords: [{ slug: 'leather', weight: 90 }, { slug: 'oriental', weight: 60 }] },
  { slug: 'vanille-brulee', name: { ru: 'Vanille Brûlée', en: 'Vanille Brûlée' }, description: { ru: 'Жжёная ваниль и сандал. Сладко, но не приторно.', en: 'Burnt vanilla and sandalwood.' },
    price: 1720000, brand: 'kora-lab', gender: 'women', concentration: 'EDP', releaseYear: 2022, avgRating: 8.2, reviewsCount: 52, perfumer: 'd-rashidova',
    notes: [{ slug: 'bergamot', layer: 'top' }, { slug: 'vanilla', layer: 'middle' }, { slug: 'sandalwood', layer: 'base' }, { slug: 'amber', layer: 'base' }],
    accords: [{ slug: 'gourmand', weight: 90 }, { slug: 'woody', weight: 50 }] },
];

async function main() {
  console.log('Seeding sample catalog…');

  const brandId = new Map<string, number>();
  for (const b of BRANDS) {
    const row = await db.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name, country: b.country, niche: b.niche, description: j(b.description) },
      create: { slug: b.slug, name: b.name, country: b.country, niche: b.niche, description: j(b.description) },
    });
    brandId.set(b.slug, row.id);
  }

  const noteId = new Map<string, number>();
  for (const n of NOTES) {
    const row = await db.note.upsert({
      where: { slug: n.slug },
      update: { name: j(n.name), family: n.family, iconUrl: n.iconUrl },
      create: { slug: n.slug, name: j(n.name), family: n.family, iconUrl: n.iconUrl },
    });
    noteId.set(n.slug, row.id);
  }

  const accordId = new Map<string, number>();
  for (const a of ACCORDS) {
    const row = await db.accord.upsert({
      where: { slug: a.slug },
      update: { name: j(a.name), colorHex: a.colorHex },
      create: { slug: a.slug, name: j(a.name), colorHex: a.colorHex },
    });
    accordId.set(a.slug, row.id);
  }

  const perfumerId = new Map<string, number>();
  for (const p of PERFUMERS) {
    const row = await db.perfumer.upsert({
      where: { slug: p.slug },
      update: { name: p.name, country: p.country, bio: j(p.bio) },
      create: { slug: p.slug, name: p.name, country: p.country, bio: j(p.bio) },
    });
    perfumerId.set(p.slug, row.id);
  }

  for (const p of PRODUCTS) {
    const product = await db.product.upsert({
      where: { slug: p.slug },
      update: { name: j(p.name), description: j(p.description), status: 'active', price: p.price },
      create: { slug: p.slug, name: j(p.name), description: j(p.description), status: 'active', price: p.price },
    });

    await db.fragranceDetail.upsert({
      where: { productId: product.id },
      update: { brandId: brandId.get(p.brand), gender: p.gender, concentration: p.concentration, releaseYear: p.releaseYear, avgRating: p.avgRating, reviewsCount: p.reviewsCount },
      create: { productId: product.id, brandId: brandId.get(p.brand), gender: p.gender, concentration: p.concentration, releaseYear: p.releaseYear, avgRating: p.avgRating, reviewsCount: p.reviewsCount },
    });

    // replace-all joins (idempotent)
    await db.productNote.deleteMany({ where: { productId: product.id } });
    await db.productNote.createMany({
      data: p.notes.map((n, i) => ({ productId: product.id, noteId: noteId.get(n.slug)!, pyramidLayer: n.layer, position: i })),
    });

    await db.productAccord.deleteMany({ where: { productId: product.id } });
    await db.productAccord.createMany({
      data: p.accords.map((a) => ({ productId: product.id, accordId: accordId.get(a.slug)!, weight: a.weight })),
    });

    await db.productPerfumer.deleteMany({ where: { productId: product.id } });
    if (p.perfumer) {
      await db.productPerfumer.create({ data: { productId: product.id, perfumerId: perfumerId.get(p.perfumer)! } });
    }
  }

  console.log(`Seeded ${BRANDS.length} brands, ${NOTES.length} notes, ${ACCORDS.length} accords, ${PERFUMERS.length} perfumers, ${PRODUCTS.length} products.`);
  console.log('Note: products have no bottle images in this sample — real imagery comes from the Spree ETL.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
