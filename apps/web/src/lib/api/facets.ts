import {
  filterFacetsResponseSchema,
  type BrandFacet,
  type FamilyFacet,
  type FilterFacets,
  type GenderFacet,
  type NoteFacet,
} from '@labor/api-client/catalog';
import type { ZodType } from 'zod';

import { apiFetch } from './client';

export type { BrandFacet, FamilyFacet, FilterFacets, GenderFacet, NoteFacet };

const parseApiResponse = <T>(schema: ZodType<T>, value: unknown, label: string): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`${label} returned an invalid catalog payload: ${parsed.error.message}`);
  }

  return parsed.data;
};

export const getFilterFacets = async (locale: string) => {
  const response = await apiFetch<unknown>('/storefront/filter_facets', {
    locale,
    next: { revalidate: 300, tags: ['filter_facets'] },
  });

  return parseApiResponse(filterFacetsResponseSchema, response, 'GET /storefront/filter_facets');
};
