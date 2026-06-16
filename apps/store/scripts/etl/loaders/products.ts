// Product loader: spree_products (+ spree_product_translations, + spree_prices via
// spree_variants) -> Prisma Product (including the integer UZS `price`).
//
// Source columns:
//   spree_products: id, slug, name, description, status, available_on, deleted_at
//   spree_product_translations: spree_product_id, locale, name, description
//   spree_variants: id, product_id, is_master  (links product -> price rows)
//   spree_prices: variant_id, amount (decimal), currency, deleted_at, price_list_id
//
// Decisions:
//   - SKIP products with deleted_at IS NOT NULL.
//   - name/description: base columns seed the `ru` fallback, translation rows
//     override per locale. Product.name is REQUIRED JSON (slug fallback).
//   - status: carried verbatim ("active" | "draft" | "archived"); Spree default is
//     "draft". (Spree statuses are active/draft/archived, matching the target.)
//   - price: take the UZS default price row (price_list_id IS NULL, deleted_at IS
//     NULL, currency='UZS'). Prefer the master variant's price; fall back to any
//     UZS price for the product. amount (decimal) -> integer minor units via
//     Math.round(Number(amount)). UZS has no minor unit, so 100 so'm = 100.
//
// Idempotent: upsert by `slug`.
//
// Returns BOTH maps the rest of the ETL needs:
//   - oldIdToNewId: old spree_products.id -> new Product.id (for join loaders,
//     fragrance details, images, votes, wishlist, campaign products).
//   - slugToNewId: slug -> new Product.id (convenience / spot-checks).

import { db } from "@/lib/db";
import {
  collapseLocaleJson,
  collapseRequiredLocaleJson,
  fetchTranslations,
  query,
} from "../source";

export interface ProductMaps {
  oldIdToNewId: Map<number, number>;
  slugToNewId: Map<string, number>;
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  available_on: Date | null;
}

interface PriceRow {
  product_id: string;
  amount: string | null;
  is_master: boolean;
}

const TARGET_CURRENCY = "UZS";

/**
 * Build a map of old spree_product_id -> integer UZS price (minor units).
 * One query joins prices to variants so we get every product's UZS prices in one go.
 */
async function loadPriceMap(): Promise<Map<number, number>> {
  const rows = await query<PriceRow>(
    `SELECT v.product_id AS product_id,
            p.amount      AS amount,
            v.is_master   AS is_master
       FROM spree_prices p
       JOIN spree_variants v ON v.id = p.variant_id
      WHERE p.currency = $1
        AND p.deleted_at IS NULL
        AND p.price_list_id IS NULL
        AND p.amount IS NOT NULL
        AND v.deleted_at IS NULL`,
    [TARGET_CURRENCY],
  );

  // Prefer the master variant's price; otherwise any UZS price for the product.
  const masterPrice = new Map<number, number>();
  const anyPrice = new Map<number, number>();

  for (const r of rows) {
    const pid = Number(r.product_id);
    const minorUnits = Math.round(Number(r.amount));
    if (r.is_master) {
      if (!masterPrice.has(pid)) masterPrice.set(pid, minorUnits);
    } else if (!anyPrice.has(pid)) {
      anyPrice.set(pid, minorUnits);
    }
  }

  const out = new Map<number, number>();
  const productIds = new Set<number>([...masterPrice.keys(), ...anyPrice.keys()]);
  for (const pid of productIds) {
    out.set(pid, masterPrice.get(pid) ?? anyPrice.get(pid) ?? 0);
  }
  return out;
}

export async function loadProducts(): Promise<ProductMaps> {
  const products = await query<ProductRow>(
    `SELECT id, slug, name, description, status, available_on
       FROM spree_products
      WHERE deleted_at IS NULL
      ORDER BY id`,
  );

  const ids = products.map((p) => Number(p.id));
  const names = await fetchTranslations(
    "spree_product_translations",
    "spree_product_id",
    "name",
    ids,
  );
  const descriptions = await fetchTranslations(
    "spree_product_translations",
    "spree_product_id",
    "description",
    ids,
  );
  const priceMap = await loadPriceMap();

  const oldIdToNewId = new Map<number, number>();
  const slugToNewId = new Map<string, number>();

  for (const p of products) {
    const id = Number(p.id);
    const name = collapseRequiredLocaleJson(p.name, names.get(id) ?? [], p.slug);
    const description = collapseLocaleJson(p.description, descriptions.get(id) ?? []);
    const price = priceMap.get(id) ?? 0;

    const data = {
      name,
      description: description ?? undefined,
      status: p.status,
      availableOn: p.available_on,
      price,
    };

    const saved = await db.product.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
      select: { id: true },
    });
    oldIdToNewId.set(id, saved.id);
    slugToNewId.set(p.slug, saved.id);
  }

  console.log(`[products] upserted ${oldIdToNewId.size} products (deleted skipped)`);
  return { oldIdToNewId, slugToNewId };
}
