// Server reads backing the admin catalog UI. Unlike lib/catalog/products.ts
// (which projects localized DTOs for the storefront), these return the *raw*
// editable shapes — per-locale JSON name/description objects, taxonomy join rows,
// images with positions — so the admin forms can round-trip every field.
//
// All money stays integer UZS minor units; formatting happens at render.

import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import type { LocaleText, PyramidLayer } from '@/lib/catalog/types';

export const ADMIN_PAGE_SIZE = 20;

// ── per-locale JSON coercion ────────────────────────────────────────────────────

/** Coerce a stored Json value into an editable { ru, uz, en } shape (ru required). */
export const toLocaleText = (value: Prisma.JsonValue | null | undefined): LocaleText => {
  if (typeof value === 'string') {
    return { ru: value };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    const pick = (k: string): string | undefined =>
      typeof rec[k] === 'string' ? (rec[k] as string) : undefined;
    return {
      ru: pick('ru') ?? '',
      ...(pick('uz') !== undefined ? { uz: pick('uz') } : {}),
      ...(pick('en') !== undefined ? { en: pick('en') } : {}),
    };
  }
  return { ru: '' };
};

// ── products list ───────────────────────────────────────────────────────────────

export interface AdminProductRow {
  id: number;
  slug: string;
  name: string; // resolved (ru-primary) for the table
  brand: string;
  price: number; // integer UZS minor units
  status: string;
  image: string;
}

export interface ListAdminProductsParams {
  q?: string;
  page?: number;
}

export interface ListAdminProductsResult {
  data: AdminProductRow[];
  meta: { total: number; totalPages: number; page: number };
}

const adminCardSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  status: true,
  images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
  fragrance: { select: { brand: { select: { name: true } } } },
} satisfies Prisma.ProductSelect;

export const listAdminProducts = async (
  params: ListAdminProductsParams = {},
): Promise<ListAdminProductsResult> => {
  const page = Math.max(1, params.page ?? 1);
  const q = params.q?.trim();

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [{ slug: { contains: q } }, { name: { contains: q } }];
  }

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: adminCardSelect,
    }),
  ]);

  return {
    data: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: resolveLocaleText(row.name, 'ru'),
      brand: row.fragrance?.brand?.name ?? '',
      price: row.price,
      status: row.status,
      image: row.images[0]?.url ?? '',
    })),
    meta: {
      total,
      totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
      page,
    },
  };
};

// ── product edit shape ──────────────────────────────────────────────────────────

export interface AdminProductNote {
  id: number;
  noteId: number;
  noteName: string;
  pyramidLayer: PyramidLayer;
  position: number;
}

export interface AdminProductAccord {
  id: number;
  accordId: number;
  accordName: string;
  colorHex: string | null;
  weight: number;
}

export interface AdminProductPerfumer {
  id: number;
  perfumerId: number;
  name: string;
}

export interface AdminProductImage {
  id: number;
  url: string;
  alt: string | null;
  position: number;
}

export interface AdminProduct {
  id: number;
  slug: string;
  name: LocaleText;
  description: LocaleText;
  status: string;
  price: number;
  gender: string;
  concentration: string;
  brandId: number | null;
  notes: AdminProductNote[];
  accords: AdminProductAccord[];
  perfumers: AdminProductPerfumer[];
  images: AdminProductImage[];
}

const isPyramidLayer = (v: string): v is PyramidLayer =>
  v === 'top' || v === 'middle' || v === 'base';

export const getAdminProduct = async (id: number): Promise<AdminProduct | null> => {
  const product = await db.product.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      status: true,
      price: true,
      fragrance: {
        select: { gender: true, concentration: true, brandId: true },
      },
      notes: {
        orderBy: [{ pyramidLayer: 'asc' }, { position: 'asc' }],
        select: {
          id: true,
          noteId: true,
          pyramidLayer: true,
          position: true,
          note: { select: { name: true } },
        },
      },
      accords: {
        orderBy: { weight: 'desc' },
        select: {
          id: true,
          accordId: true,
          weight: true,
          accord: { select: { name: true, colorHex: true } },
        },
      },
      perfumers: {
        select: {
          id: true,
          perfumerId: true,
          perfumer: { select: { name: true } },
        },
      },
      images: {
        orderBy: { position: 'asc' },
        select: { id: true, url: true, alt: true, position: true },
      },
    },
  });

  if (!product) return null;

  return {
    id: product.id,
    slug: product.slug,
    name: toLocaleText(product.name),
    description: toLocaleText(product.description),
    status: product.status,
    price: product.price,
    gender: product.fragrance?.gender ?? 'unisex',
    concentration: product.fragrance?.concentration ?? '',
    brandId: product.fragrance?.brandId ?? null,
    notes: product.notes
      .filter((n) => isPyramidLayer(n.pyramidLayer))
      .map((n) => ({
        id: n.id,
        noteId: n.noteId,
        noteName: resolveLocaleText(n.note.name, 'ru'),
        pyramidLayer: n.pyramidLayer as PyramidLayer,
        position: n.position,
      })),
    accords: product.accords.map((a) => ({
      id: a.id,
      accordId: a.accordId,
      accordName: resolveLocaleText(a.accord.name, 'ru'),
      colorHex: a.accord.colorHex,
      weight: a.weight,
    })),
    perfumers: product.perfumers.map((p) => ({
      id: p.id,
      perfumerId: p.perfumerId,
      name: p.perfumer.name,
    })),
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      position: img.position,
    })),
  };
};

// ── select option sources ───────────────────────────────────────────────────────

export interface SelectOption {
  id: number;
  label: string;
}

export const listBrandsForSelect = async (): Promise<SelectOption[]> => {
  const rows = await db.brand.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  return rows.map((r) => ({ id: r.id, label: r.name }));
};

export const listNotesForSelect = async (): Promise<SelectOption[]> => {
  const rows = await db.note.findMany({
    orderBy: { slug: 'asc' },
    select: { id: true, name: true },
  });
  return rows.map((r) => ({ id: r.id, label: resolveLocaleText(r.name, 'ru') }));
};

export const listAccordsForSelect = async (): Promise<SelectOption[]> => {
  const rows = await db.accord.findMany({
    orderBy: { slug: 'asc' },
    select: { id: true, name: true },
  });
  return rows.map((r) => ({ id: r.id, label: resolveLocaleText(r.name, 'ru') }));
};

export const listPerfumersForSelect = async (): Promise<SelectOption[]> => {
  const rows = await db.perfumer.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  return rows.map((r) => ({ id: r.id, label: r.name }));
};

// ── taxonomy list reads (full editable rows for the taxonomy pages) ──────────────

export interface AdminBrand {
  id: number;
  slug: string;
  name: string;
  country: string;
  niche: boolean;
  active: boolean;
  productCount: number;
}

export const listAdminBrands = async (): Promise<AdminBrand[]> => {
  const rows = await db.brand.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      country: true,
      niche: true,
      active: true,
      _count: { select: { products: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    country: r.country ?? '',
    niche: r.niche,
    active: r.active,
    productCount: r._count.products,
  }));
};

export interface AdminNote {
  id: number;
  slug: string;
  name: LocaleText;
  family: string;
  iconUrl: string;
  productCount: number;
}

export const listAdminNotes = async (): Promise<AdminNote[]> => {
  const rows = await db.note.findMany({
    orderBy: { slug: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      family: true,
      iconUrl: true,
      _count: { select: { productNotes: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: toLocaleText(r.name),
    family: r.family ?? '',
    iconUrl: r.iconUrl ?? '',
    productCount: r._count.productNotes,
  }));
};

export interface AdminAccord {
  id: number;
  slug: string;
  name: LocaleText;
  colorHex: string;
  productCount: number;
}

export const listAdminAccords = async (): Promise<AdminAccord[]> => {
  const rows = await db.accord.findMany({
    orderBy: { slug: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      colorHex: true,
      _count: { select: { productAccords: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: toLocaleText(r.name),
    colorHex: r.colorHex ?? '',
    productCount: r._count.productAccords,
  }));
};

export interface AdminPerfumer {
  id: number;
  slug: string;
  name: string;
  country: string;
  productCount: number;
}

export const listAdminPerfumers = async (): Promise<AdminPerfumer[]> => {
  const rows = await db.perfumer.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      country: true,
      _count: { select: { productPerfumers: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    country: r.country ?? '',
    productCount: r._count.productPerfumers,
  }));
};
