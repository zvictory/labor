import { z } from 'zod';

export const productCardSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  brand: z.string(),
  price: z.number(),
  image: z.string(),
  avg_rating: z.number(),
  votes_count: z.number(),
  top_accord: z
    .object({
      name: z.string(),
      color_hex: z.string(),
    })
    .nullable()
    .optional(),
});

export const catalogMetaSchema = z.object({
  total_count: z.number(),
  total_pages: z.number(),
});

export const productListResponseSchema = z.object({
  data: z.array(productCardSchema),
  meta: catalogMetaSchema,
});

export const fragranceNoteSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  family: z.string(),
  layer: z.enum(['top', 'heart', 'base']),
  icon_url: z.string(),
});

export const fragranceAccordSchema = z.object({
  id: z.number(),
  name: z.string(),
  weight: z.number(),
  color_hex: z.string(),
});

export const productSizeSchema = z.object({
  variant_id: z.number().int().positive(),
  ml: z.number().int().positive(),
  price: z.number().int().nonnegative(),
});

export type ProductSize = z.infer<typeof productSizeSchema>;

export const productSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  brand: z.object({ id: z.number(), name: z.string(), slug: z.string() }),
  perfumers: z.array(z.object({ id: z.number(), name: z.string() })),
  gender: z.enum(['masculine', 'feminine', 'unisex']),
  concentration: z.enum(['edc', 'edt', 'edp', 'parfum', 'extrait', 'cologne']),
  volume_ml: z.number(),
  price: z.number(),
  currency: z.literal('UZS'),
  images: z.array(z.object({ url: z.string(), alt: z.string() })),
  description: z.string().nullable().optional(),
  // Present after labor:sizes:generate has been run.
  // Sorted by ml asc. null or absent = no size variants yet.
  sizes: z.array(productSizeSchema).nullish(),
  fragrance: z.object({
    notes: z.array(fragranceNoteSchema),
    accords: z.array(fragranceAccordSchema),
    avg_rating: z.number(),
    avg_longevity: z.number(),
    avg_sillage: z.number(),
    votes_count: z.number(),
    reviews_count: z.number(),
    seasons: z.record(z.number()),
    time: z.record(z.number()),
    love: z.record(z.number()),
  }),
  similar: z.array(
    z.object({
      id: z.number(),
      slug: z.string(),
      name: z.string(),
      image: z.string(),
      brand: z.string(),
    }),
  ),
});

export const productDetailResponseSchema = z.object({
  data: productSchema,
});

export type ProductCard = z.infer<typeof productCardSchema>;
export type CatalogMeta = z.infer<typeof catalogMetaSchema>;
export type ProductListResponse = z.infer<typeof productListResponseSchema>;
export type FragranceNote = z.infer<typeof fragranceNoteSchema>;
export type FragranceAccord = z.infer<typeof fragranceAccordSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductDetailResponse = z.infer<typeof productDetailResponseSchema>;
