import { apiFetch } from './client';
import type { ProductCard } from './products';

export interface BrandSummary {
  slug: string;
  name: string;
  origin?: string;
  country?: string;
  founded_year?: number | null;
  website?: string;
  logo_url?: string | null;
  niche?: boolean;
  description?: string;
  story?: string;
  product_count: number;
}

export interface BrandDetail {
  slug: string;
  name: string;
  origin?: string;
  country?: string;
  founded_year?: number | null;
  website?: string;
  logo_url?: string | null;
  niche?: boolean;
  description?: string;
  story?: string;
  products: ProductCard[];
}

export const getBrands = async (locale: string): Promise<BrandSummary[]> => {
  const res = await apiFetch<{ data: BrandSummary[] }>('/storefront/brands', {
    locale,
    next: { revalidate: 300, tags: ['brands'] },
  });
  return res.data;
};

export const getBrand = async (slug: string, locale: string): Promise<BrandDetail> => {
  const res = await apiFetch<{ data: BrandDetail }>(`/storefront/brands/${slug}`, {
    locale,
    next: { revalidate: 300, tags: [`brand:${slug}`] },
  });
  return res.data;
};
