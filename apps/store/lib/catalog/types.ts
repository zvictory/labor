// DTO contract shared between the server data-access layer (this package), the
// ETL, and the UI (Agent 5). Field names match what the carried-over prototype
// components consume (see apps/web ProductCard) — do not rename without updating
// every consumer.

/// Per-locale text. ru is required; uz/en optional with ru fallback.
export type LocaleText = { ru: string; uz?: string; en?: string };

/// Pyramid layer of a fragrance note.
export type PyramidLayer = 'top' | 'middle' | 'base';

/// Gender targeting of a fragrance.
export type Gender = 'men' | 'women' | 'unisex';

/// Product card — the grid/list unit consumed by `ProductCard`.
export interface ProductCardDTO {
  id: number;
  slug: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  avg_rating: number;
  votes_count: number;
  top_accord?: { name: string; color_hex: string } | null;
}

/// Note as surfaced on listing/browse pages.
export interface NoteDTO {
  slug: string;
  name: string;
  family?: string;
  color_hex?: string;
  icon_url?: string;
  product_count: number;
}

/// Brand as surfaced on browse pages.
export interface BrandDTO {
  slug: string;
  name: string;
  country?: string;
  niche?: boolean;
  product_count: number;
}

/// Perfumer as surfaced on browse pages.
export interface PerfumerDTO {
  slug: string;
  name: string;
  country?: string;
  product_count: number;
}

/// A note within a product detail's pyramid (lighter than NoteDTO — no counts).
export interface ProductNoteDTO {
  slug: string;
  name: string;
  family?: string;
  color_hex?: string;
  icon_url?: string;
}

/// An accord weighting on a product detail.
export interface ProductAccordDTO {
  slug?: string;
  name: string;
  color_hex: string;
  weight: number;
}

/// A perfumer credited on a product detail.
export interface ProductPerfumerDTO {
  slug: string;
  name: string;
}

/// Notes grouped by pyramid layer for the PDP scent pyramid.
export interface NotePyramidDTO {
  top: ProductNoteDTO[];
  middle: ProductNoteDTO[];
  base: ProductNoteDTO[];
}

/// Full product detail — the PDP payload.
export interface ProductDetailDTO {
  id: number;
  slug: string;
  name: string;
  description: string;
  brand: string;
  brand_slug?: string;
  price: number;
  image: string;
  images: string[];
  gender: Gender;
  concentration?: string;
  volume_ml?: number | null;
  avg_rating: number;
  avg_longevity: number;
  avg_sillage: number;
  votes_count: number;
  notes: NotePyramidDTO;
  accords: ProductAccordDTO[];
  perfumers: ProductPerfumerDTO[];
  similar: ProductCardDTO[];
  seasons: Record<string, number>;
  time: Record<string, number>;
  love: Record<string, number>;
}
