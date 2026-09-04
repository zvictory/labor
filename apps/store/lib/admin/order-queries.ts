// Read-side order access for the ADMIN console. Mirrors the storefront queries in
// lib/orders/queries.ts but projects what the operator views need: a paginated,
// filterable list (by status + free-text on number/phone) and a full detail
// payload (line items with resolved product names, payments, shipping snapshot).
//
// Product names are per-locale JSON; resolved via resolveLocaleText with ru
// fallback. Money stays integer UZS minor units — formatting is the UI's job.

import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { getDeliveryMethod } from '@/lib/delivery/methods';
import type {
  OrderStatus,
  OrderPaymentStatus,
  PaymentState,
} from '@/lib/orders/queries';

export const ADMIN_ORDERS_PAGE_SIZE = 20;

/** Compact row for the admin orders table. Money is integer so'm. */
export interface AdminOrderRow {
  number: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  total: number;
  phone: string | null;
  itemsCount: number;
  createdAt: Date;
}

export interface ListAdminOrdersParams {
  status?: string; // one of OrderStatus, else ignored (all)
  q?: string; // matches order number OR customer phone (contains)
  page?: number;
}

export interface ListAdminOrdersResult {
  data: AdminOrderRow[];
  meta: { total: number; totalPages: number; page: number };
}

const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'paid',
  'shipped',
  'delivered',
  'canceled',
];

const isOrderStatus = (value: string): value is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(value);

function buildOrdersWhere(params: ListAdminOrdersParams): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (params.status && isOrderStatus(params.status)) {
    where.status = params.status;
  }

  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * Paginated, filterable order list for the admin table. `status` narrows by a
 * single status (ignored if not a known status); `q` matches order number or
 * customer phone (case-insensitive contains). Newest first.
 */
export async function listAdminOrders(
  params: ListAdminOrdersParams = {},
): Promise<ListAdminOrdersResult> {
  const page = Math.max(1, params.page ?? 1);
  const where = buildOrdersWhere(params);

  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * ADMIN_ORDERS_PAGE_SIZE,
      take: ADMIN_ORDERS_PAGE_SIZE,
      select: {
        number: true,
        status: true,
        paymentStatus: true,
        total: true,
        phone: true,
        createdAt: true,
        items: { select: { quantity: true } },
      },
    }),
  ]);

  const data: AdminOrderRow[] = rows.map((r) => ({
    number: r.number,
    status: r.status as OrderStatus,
    paymentStatus: r.paymentStatus as OrderPaymentStatus,
    total: r.total,
    phone: r.phone,
    itemsCount: r.items.reduce((sum, it) => sum + it.quantity, 0),
    createdAt: r.createdAt,
  }));

  return {
    data,
    meta: {
      total,
      totalPages: Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE)),
      page,
    },
  };
}

// ── detail ──────────────────────────────────────────────────────────────────────

export interface AdminOrderLine {
  productId: number;
  slug: string;
  name: string;
  quantity: number;
  unitPrice: number; // integer so'm
  lineTotal: number; // unitPrice * quantity
  isSample: boolean;
}

export interface AdminOrderPayment {
  provider: string;
  externalTxnId: string | null;
  amount: number; // integer so'm
  state: PaymentState;
  createdAt: Date;
}

export interface AdminOrderDetail {
  number: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  subtotal: number; // sum of line totals (integer so'm)
  deliveryFee: number; // total - subtotal (clamped >= 0)
  total: number;
  // customer / shipping snapshot
  customerName: string | null;
  phone: string | null;
  region: string | null;
  district: string | null;
  address: string | null;
  deliveryMethod: string | null;
  deliveryMethodLabel: string | null; // localized, from the registry
  items: AdminOrderLine[];
  payments: AdminOrderPayment[];
  createdAt: Date;
}

/**
 * Full admin order detail by public number, or null if not found. Localizes
 * product names and the delivery-method label to `locale` (ru fallback).
 */
export async function getAdminOrder(
  number: string,
  locale: string,
): Promise<AdminOrderDetail | null> {
  const order = await db.order.findUnique({
    where: { number },
    select: {
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
      user: { select: { name: true } },
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
        orderBy: { createdAt: 'desc' },
        select: {
          provider: true,
          externalTxnId: true,
          amount: true,
          state: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order) return null;

  const items: AdminOrderLine[] = order.items.map((it) => ({
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
    customerName: order.user?.name ?? null,
    phone: order.phone,
    region: order.region,
    district: order.district,
    address: order.address,
    deliveryMethod: order.deliveryMethod,
    deliveryMethodLabel,
    items,
    payments: order.payments.map((p) => ({
      provider: p.provider,
      externalTxnId: p.externalTxnId,
      amount: p.amount,
      state: p.state as PaymentState,
      createdAt: p.createdAt,
    })),
    createdAt: order.createdAt,
  };
}
