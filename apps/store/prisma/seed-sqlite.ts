import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const db = new PrismaClient();

async function main() {
  console.log('Seeding SQLite database (dev.db) with 542 real catalog products & 107 brands…');

  const catalogPath = path.join(__dirname, '../lib/catalog/full-catalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.error('full-catalog.json not found!');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const products = data.products || [];
  const brands = data.brands || [];

  // Seed Brands
  const brandMap = new Map<string, number>();
  for (const b of brands) {
    const row = await db.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name, country: b.country || 'Niche', niche: Boolean(b.niche), logoUrl: b.image || null },
      create: { slug: b.slug, name: b.name, country: b.country || 'Niche', niche: Boolean(b.niche), logoUrl: b.image || null },
    });
    brandMap.set(b.slug, row.id);
  }
  console.log(`Seeded ${brandMap.size} brands into SQLite dev.db.`);

  // Seed Products
  let count = 0;
  for (const p of products) {
    const brandId = brandMap.get(p.brand_slug || p.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

    const productRow = await db.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name as any,
        description: (p.description || `${p.name} by ${p.brand}`) as any,
        price: p.price || 1600000,
        status: 'active',
      },
      create: {
        slug: p.slug,
        name: p.name as any,
        description: (p.description || `${p.name} by ${p.brand}`) as any,
        price: p.price || 1600000,
        status: 'active',
      },
    });

    if (brandId) {
      await db.fragranceDetail.upsert({
        where: { productId: productRow.id },
        update: {
          brandId,
          gender: p.gender || 'unisex',
          concentration: p.concentration || 'EDP',
          releaseYear: p.release_year || 2022,
          avgRating: p.avg_rating || 4.5,
          votesCount: p.votes_count || 50,
        },
        create: {
          productId: productRow.id,
          brandId,
          gender: p.gender || 'unisex',
          concentration: p.concentration || 'EDP',
          releaseYear: p.release_year || 2022,
          avgRating: p.avg_rating || 4.5,
          votesCount: p.votes_count || 50,
        },
      });
    }

    if (p.image) {
      await db.productImage.deleteMany({ where: { productId: productRow.id } });
      await db.productImage.create({
        data: {
          productId: productRow.id,
          url: p.image,
          alt: p.name,
          position: 0,
        },
      });
    }

    count++;
  }

  console.log(`Successfully seeded ${count} products into SQLite dev.db!`);
}

main()
  .catch((e) => {
    console.error('SQLite seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
