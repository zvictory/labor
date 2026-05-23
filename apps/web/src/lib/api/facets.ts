import { apiFetch } from './client';

export interface BrandFacet {
  slug: string;
  name: string;
  count: number;
}

export interface NoteFacet {
  slug: string;
  name: string | null;
  icon_url: string | null;
  count: number;
}

export interface FamilyFacet {
  slug: string;
  count: number;
}

export interface GenderFacet {
  slug: string;
  count: number;
}

export interface FilterFacets {
  brands: BrandFacet[];
  notes: NoteFacet[];
  families: FamilyFacet[];
  genders: GenderFacet[];
}

export const getFilterFacets = (locale: string) =>
  apiFetch<{ data: FilterFacets }>('/storefront/filter_facets', {
    locale,
    next: { revalidate: 300, tags: ['filter_facets'] },
  });
