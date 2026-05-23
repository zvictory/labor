import { apiFetch } from './client';
import type { ProductCard } from './products';

export interface NoteSummary {
  slug: string;
  name: string;
  family?: string;
  color_hex?: string;
  icon_url?: string;
  product_count: number;
}

export interface NoteDetail {
  slug: string;
  name: string;
  family?: string;
  color_hex?: string;
  icon_url?: string;
  products: ProductCard[];
}

export const getNotes = (locale: string): Promise<{ data: NoteSummary[] }> =>
  apiFetch<{ data: NoteSummary[] }>(`/storefront/notes`, {
    locale,
    next: { revalidate: 300, tags: ['notes'] },
  });

export const getNote = (slug: string, locale: string): Promise<{ data: NoteDetail }> =>
  apiFetch<{ data: NoteDetail }>(`/storefront/notes/${slug}`, {
    locale,
    next: { revalidate: 300, tags: [`note:${slug}`] },
  });
