import { Client } from "pg";
import { db } from "../../lib/db";

async function check() {
  const spreeUrl = process.env.SPREE_DATABASE_URL || "postgresql://labor:changeme@localhost:5432/labor_dev?schema=public";

  console.log("Connecting to Spree database...");
  const client = new Client({ connectionString: spreeUrl });
  await client.connect();

  console.log("Checking legacy spree_assets/spree_variants for images...");

  // 1. Spree asset count with Variant viewable
  const variantRes = await client.query(`
    SELECT COUNT(*) FROM spree_assets a
    JOIN spree_variants v ON v.id = a.viewable_id AND a.viewable_type = 'Spree::Variant'
  `);
  console.log("Spree asset count with Variant viewable:", variantRes.rows[0].count);

  // 2. Spree asset count with Product viewable
  const productRes = await client.query(`
    SELECT COUNT(*) FROM spree_assets a
    JOIN spree_products p ON p.id = a.viewable_id AND a.viewable_type = 'Spree::Product'
  `);
  console.log("Spree asset count with Product viewable:", productRes.rows[0].count);

  // 3. Spree assets join active_storage
  const joinRes = await client.query(`
    SELECT COUNT(*)
      FROM spree_assets a
      JOIN spree_variants v
        ON v.id = a.viewable_id
       AND a.viewable_type = 'Spree::Variant'
      JOIN active_storage_attachments att
        ON att.record_type = 'Spree::Asset'
       AND att.record_id   = a.id
       AND att.name        = 'attachment'
      JOIN active_storage_blobs b
        ON b.id = att.blob_id
  `);
  console.log("Spree assets with valid ActiveStorage attachment/blob:", joinRes.rows[0].count);

  // 4. Target database productImage count
  const targetImageCount = await db.productImage.count();
  console.log("Target database ProductImage count:", targetImageCount);

  if (targetImageCount > 0) {
    const samples = await db.productImage.findMany({ take: 5 });
    console.log("Sample target images:", JSON.stringify(samples, null, 2));
  }

  await client.end();
  await db.$disconnect();
}

check().catch(console.error);
