import { z } from 'zod';

export const brandFacetSchema = z.object({
  slug: z.string(),
  name: z.string(),
  count: z.number(),
});

export const noteFacetSchema = z.object({
  slug: z.string(),
  name: z.string().nullable(),
  icon_url: z.string().nullable(),
  count: z.number(),
});

export const familyFacetSchema = z.object({
  slug: z.string(),
  count: z.number(),
});

export const genderFacetSchema = z.object({
  slug: z.string(),
  count: z.number(),
});

export const filterFacetsSchema = z.object({
  brands: z.array(brandFacetSchema),
  notes: z.array(noteFacetSchema),
  families: z.array(familyFacetSchema),
  genders: z.array(genderFacetSchema),
});

export const filterFacetsResponseSchema = z.object({
  data: filterFacetsSchema,
});

export type BrandFacet = z.infer<typeof brandFacetSchema>;
export type NoteFacet = z.infer<typeof noteFacetSchema>;
export type FamilyFacet = z.infer<typeof familyFacetSchema>;
export type GenderFacet = z.infer<typeof genderFacetSchema>;
export type FilterFacets = z.infer<typeof filterFacetsSchema>;
export type FilterFacetsResponse = z.infer<typeof filterFacetsResponseSchema>;
