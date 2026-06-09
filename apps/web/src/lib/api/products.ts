import {
  productDetailResponseSchema,
  productListResponseSchema,
  type FragranceAccord,
  type FragranceNote,
  type Product,
  type ProductCard,
  type ProductDetailResponse,
  type ProductListResponse,
  type ProductSize,
} from '@labor/api-client/catalog';
import type { ZodType } from 'zod';

import { apiFetch } from './client';

export type {
  FragranceAccord,
  FragranceNote,
  Product,
  ProductCard,
  ProductDetailResponse,
  ProductListResponse,
  ProductSize,
};

const parseApiResponse = <T>(schema: ZodType<T>, value: unknown, label: string): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`${label} returned an invalid catalog payload: ${parsed.error.message}`);
  }

  return parsed.data;
};

export const getProduct = async (slug: string, locale: string) => {
  const response = await apiFetch<unknown>(`/storefront/products/${slug}`, {
    locale,
    next: { revalidate: 300, tags: [`product:${slug}`] },
  });

  return parseApiResponse(
    productDetailResponseSchema,
    response,
    `GET /storefront/products/${slug}`,
  );
};

export const listProducts = (params: {
  locale: string;
  page?: number | undefined;
  brand?: string | undefined;
  note?: string | undefined;
  perfumer?: string | undefined;
  family?: string | undefined;
  gender?: string | undefined;
  q?: string | undefined;
  sort?: string | undefined;
}) => {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.brand) sp.set('filter[brand]', params.brand);
  if (params.note) sp.set('filter[note]', params.note);
  if (params.perfumer) sp.set('filter[perfumer]', params.perfumer);
  if (params.family) sp.set('filter[family]', params.family);
  if (params.gender) sp.set('filter[gender]', params.gender);
  if (params.q) sp.set('filter[name]', params.q);

  if (params.sort) {
    sp.set('sort', params.sort);
  }

  return apiFetch<unknown>(`/storefront/products?${sp.toString()}`, {
    locale: params.locale,
    next: { revalidate: 120 },
  }).then((response) =>
    parseApiResponse(productListResponseSchema, response, 'GET /storefront/products'),
  );
};
