import { apiFetch } from './client';
import type { ProductCard } from './products';

export interface PerfumerSummary {
  slug: string;
  name: string;
  bio?: string;
  country?: string;
  product_count: number;
}

export interface PerfumerDetail {
  slug: string;
  name: string;
  bio?: string;
  country?: string;
  products: ProductCard[];
}

export const getPerfumers = (locale: string): Promise<{ data: PerfumerSummary[] }> =>
  apiFetch<{ data: PerfumerSummary[] }>(`/storefront/perfumers`, {
    locale,
    next: { revalidate: 300, tags: ['perfumers'] },
  });

export const getPerfumer = (slug: string, locale: string): Promise<{ data: PerfumerDetail }> =>
  apiFetch<{ data: PerfumerDetail }>(`/storefront/perfumers/${slug}`, {
    locale,
    next: { revalidate: 300, tags: [`perfumer:${slug}`] },
  });
