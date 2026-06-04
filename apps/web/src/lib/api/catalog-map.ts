import { apiFetch } from './client';

export interface CatalogMapStats {
  products: number;
  notes: number;
  product_note_links: number;
  products_with_notes: number;
  products_missing_notes: number;
  products_with_day_night: number;
}

export interface CatalogMapNode {
  id: string;
  title: string;
  color?: string;
  family?: string;
  group?: 'product' | 'note' | 'time';
  slug?: string;
}

export interface CatalogMapEdge {
  source: string;
  target: string;
  value: number;
  type?: string;
  color?: string;
}

export interface CatalogMapGraph {
  nodes: CatalogMapNode[];
  edges: CatalogMapEdge[];
}

export interface CatalogMapResponse {
  data: {
    stats: CatalogMapStats;
    graph: CatalogMapGraph;
  };
}

export const getCatalogMap = (locale: string): Promise<CatalogMapResponse> =>
  apiFetch<CatalogMapResponse>('/storefront/catalog_map?product_limit=42&notes_per_product=4', {
    locale,
    cache: 'no-store',
  });
