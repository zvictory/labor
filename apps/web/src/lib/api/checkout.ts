import { z } from 'zod';
import { apiFetch, ApiError } from './client';

const PHONE_REGEX = /^\+?\d[\d\s\-()]{7,}$/;

export const CheckoutPayloadSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().regex(PHONE_REGEX),
  city: z.string().trim().min(1),
  street: z.string().trim().min(1),
  building: z.string().trim().min(1),
  apt: z.string().trim().optional(),
  comment: z.string().trim().optional(),
  delivery_method: z.enum(['yandex', 'express24', 'bts']),
  payment_method: z.enum(['click', 'payme', 'uzum']),
  line_items: z
    .array(
      z.object({
        variant_id: z.number().int().positive(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export type CheckoutPayload = z.infer<typeof CheckoutPayloadSchema>;

export interface CheckoutResponse {
  order_number: string;
  payment_url: string;
  payment_method: string;
}

interface BackendCheckoutEnvelope {
  data: {
    number: string;
    total: number;
    payment_redirect_url: string | null;
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const composeAddress = (p: CheckoutPayload): string => {
  const apt = p.apt ? `, кв. ${p.apt}` : '';
  return `${p.street}, ${p.building}${apt}`;
};

export const createCheckout = async (
  payload: CheckoutPayload,
  locale: string,
): Promise<CheckoutResponse> => {
  const parsed = CheckoutPayloadSchema.parse(payload);

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('labor-token') ?? undefined
      : undefined;

  try {
    const res = await apiFetch<BackendCheckoutEnvelope>('/storefront/checkout', {
      method: 'POST',
      locale,
      token,
      body: {
        line_items: parsed.line_items,
        ship_address: {
          name: parsed.name,
          phone: parsed.phone,
          city: parsed.city,
          address: composeAddress(parsed),
        },
        delivery_provider: parsed.delivery_method,
        payment_method: parsed.payment_method,
        comment: parsed.comment,
      },
    });

    if (!res.data.payment_redirect_url) {
      throw new Error('checkout response missing payment_redirect_url');
    }

    return {
      order_number: res.data.number,
      payment_url: res.data.payment_redirect_url,
      payment_method: parsed.payment_method,
    };
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      const body: unknown = err.body;
      let message = err.message;
      if (isRecord(body) && typeof body.error === 'string') {
        message = body.error;
      }
      throw new Error(message);
    }
    throw err instanceof Error ? err : new Error('checkout failed');
  }
};
