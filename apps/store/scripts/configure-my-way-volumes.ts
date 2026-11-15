// User-confirmed My Way sizes. Dry run unless --apply, isolated preview only.
import { PrismaClient, Prisma } from '@prisma/client';

const db = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const changes = await db.$transaction(
    async (tx) => {
      const [database] = await tx.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
      if (database?.name !== 'labor_design_check_20261115') {
        throw new Error('Use the isolated labor_design_check_20261115 database');
      }

      const products = await tx.product.findMany({
        where: { slug: { in: ['my-way', 'my-way-50-ml'] } },
        include: {
          fragrance: { include: { brand: true } },
          images: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
        },
      });
      const primary = products.find(({ slug }) => slug === 'my-way');
      const variant = products.find(({ slug }) => slug === 'my-way-50-ml');
      const brandId = primary?.fragrance?.brandId;
      if (
        !primary ||
        !variant ||
        !variant.fragrance ||
        !brandId ||
        primary.status !== 'active' ||
        variant.status !== 'active' ||
        primary.fragrance?.brand?.slug !== 'giorgio-armani' ||
        primary.fragrance.concentration !== 'edp' ||
        primary.fragrance.volumeMl !== 10 ||
        primary.price !== 160000
      )
        throw new Error('Unexpected My Way records. Review catalogue data before applying.');

      const name = { ru: 'My Way', en: 'My Way', uz: 'My Way' };
      const imageData = ({ url, alt, position }: (typeof primary.images)[number]) => ({
        url,
        alt,
        position,
      });
      const images = primary.images.map(imageData);
      const previousImages = variant.images.map(imageData);
      const productChanged =
        variant.price !== 800000 ||
        Object.entries(name).some(([locale, value]) => {
          const record = variant.name;
          return (
            !record ||
            typeof record !== 'object' ||
            Array.isArray(record) ||
            record[locale] !== value
          );
        });
      const fragranceChanged =
        variant.fragrance.brandId !== brandId ||
        variant.fragrance.concentration !== 'edp' ||
        variant.fragrance.volumeMl !== 50 ||
        variant.fragrance.gender !== primary.fragrance.gender ||
        variant.fragrance.releaseYear !== primary.fragrance.releaseYear;
      const imagesChanged = JSON.stringify(previousImages) !== JSON.stringify(images);
      if (apply && productChanged) {
        await tx.product.update({ where: { id: variant.id }, data: { name, price: 800000 } });
      }
      if (apply && fragranceChanged) {
        await tx.fragranceDetail.update({
          where: { productId: variant.id },
          data: {
            brandId,
            concentration: 'edp',
            volumeMl: 50,
            gender: primary.fragrance.gender,
            releaseYear: primary.fragrance.releaseYear,
          },
        });
      }
      if (apply && imagesChanged) {
        await tx.productImage.deleteMany({ where: { productId: variant.id } });
        await tx.productImage.createMany({
          data: images.map((image) => ({ ...image, productId: variant.id })),
        });
      }
      return {
        productId: variant.id,
        productChanged,
        fragranceChanged,
        imagesChanged,
        before: {
          price: variant.price,
          name: variant.name,
          brandId: variant.fragrance.brandId,
          concentration: variant.fragrance.concentration,
          volumeMl: variant.fragrance.volumeMl,
          gender: variant.fragrance.gender,
          releaseYear: variant.fragrance.releaseYear,
          images: previousImages,
        },
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  console.log(JSON.stringify({ applied: apply, ...changes }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
