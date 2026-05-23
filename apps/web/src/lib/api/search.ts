import { apiFetch } from './client';
import type { ProductCard } from './products';

export interface SearchProductsResult {
  items: ProductCard[];
  totalCount: number;
  totalPages: number;
}

interface SearchResponse {
  data: ProductCard[];
  meta: { total_count: number; total_pages: number; query?: string };
}

export interface SearchProductsOpts {
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

export const searchProducts = async (
  query: string,
  locale: string,
  opts: SearchProductsOpts = {},
): Promise<SearchProductsResult> => {
  const { page = 1, perPage = 24 } = opts;
  const sp = new URLSearchParams();
  sp.set('q', query);
  sp.set('page', String(page));
  sp.set('per_page', String(perPage));

  const res = await apiFetch<SearchResponse>(`/storefront/search?${sp.toString()}`, {
    locale,
  });

  return {
    items: res.data,
    totalCount: res.meta.total_count,
    totalPages: res.meta.total_pages,
  };
};
