// Read-side order access for the confirmation/status page. Returns a fully
// localized, UI-ready OrderDTO so the page component stays presentational.
//
// Product names are translatable JSON ({ ru, uz, en }); we resolve them through
// resolveLocaleText with ru fallback. Delivery method labels come from the
// static registry. Money stays integer so'm — formatting is the UI's job.

import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { getDeliveryMethod } from '@/lib/delivery/methods';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'canceled';
export type OrderPaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentState = 'created' | 'authorized' | 'paid' | 'canceled';

export interface OrderLineDTO {
  productId: number;
  slug: string;
  name: string;
  quantity: number;
  unitPrice: number; // integer so'm
  lineTotal: number; // unitPrice * quantity
  isSample: boolean;
}

export interface OrderPaymentDTO {
  provider: string;
  amount: number; // integer so'm
  state: PaymentState;
}

export interface OrderDTO {
  number: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  subtotal: number; // integer so'm (sum of line totals)
  deliveryFee: number; // integer so'm (total - subtotal)
  total: number; // integer so'm
  // shipping snapshot
  region: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  deliveryMethod: string | null;
  deliveryMethodLabel: string | null; // localized, from the registry
  items: OrderLineDTO[];
  payments: OrderPaymentDTO[];
  createdAt: Date;
}

const orderSelect = {
  number: true,
  status: true,
  paymentStatus: true,
  total: true,
  region: true,
  district: true,
  address: true,
  phone: true,
  deliveryMethod: true,
  createdAt: true,
  items: {
    select: {
      productId: true,
      quantity: true,
      unitPrice: true,
      isSample: true,
      product: { select: { slug: true, name: true } },
    },
  },
  payments: {
    orderBy: { createdAt: 'desc' as const },
    select: { provider: true, amount: true, state: true },
  },
} as const;

type OrderRow = {
  number: string;
  status: string;
  paymentStatus: string;
  total: number;
  region: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  deliveryMethod: string | null;
  createdAt: Date;
  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
    isSample: boolean;
    product: { slug: string; name: unknown };
  }[];
  payments: { provider: string; amount: number; state: string }[];
};

function toDTO(order: OrderRow, locale: string): OrderDTO {
  const items: OrderLineDTO[] = order.items.map((it) => ({
    productId: it.productId,
    slug: it.product.slug,
    name: resolveLocaleText(it.product.name, locale),
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    lineTotal: it.unitPrice * it.quantity,
    isSample: it.isSample,
  }));

  const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
  const deliveryFee = Math.max(0, order.total - subtotal);

  const method = order.deliveryMethod ? getDeliveryMethod(order.deliveryMethod) : undefined;
  const deliveryMethodLabel = method ? resolveLocaleText(method.label, locale) : null;

  return {
    number: order.number,
    status: order.status as OrderStatus,
    paymentStatus: order.paymentStatus as OrderPaymentStatus,
    subtotal,
    deliveryFee,
    total: order.total,
    region: order.region,
    district: order.district,
    address: order.address,
    phone: order.phone,
    deliveryMethod: order.deliveryMethod,
    deliveryMethodLabel,
    items,
    payments: order.payments.map((p) => ({
      provider: p.provider,
      amount: p.amount,
      state: p.state as PaymentState,
    })),
    createdAt: order.createdAt,
  };
}

/// Fetch a localized OrderDTO by its public number, or null if not found.
export async function getOrderByNumber(
  number: string,
  locale: string,
): Promise<OrderDTO | null> {
  const order = await db.order.findUnique({
    where: { number },
    select: orderSelect,
  });
  if (!order) return null;
  return toDTO(order as OrderRow, locale);
}

/// Alias kept for the confirmation page's "summary" framing — identical shape.
export const getOrderSummary = getOrderByNumber;
