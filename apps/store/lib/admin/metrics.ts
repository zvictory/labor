// Dashboard metrics aggregation. Keeps the admin landing page thin: it issues all
// the counts/recent-order reads in a single Promise.all round so the RSC awaits
// once. Money fields stay integer UZS minor units — formatting happens at render.

import { db } from '@/lib/db';

/** Order lifecycle statuses, in pipeline order (mirrors schema default + flow). */
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'paid',
  'shipped',
  'delivered',
  'canceled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface RecentOrder {
  id: number;
  number: string;
  status: string;
  total: number; // integer UZS minor units
  createdAt: Date;
}

export interface AdminMetrics {
  counts: {
    products: number;
    orders: number;
    brands: number;
    notes: number;
    users: number;
    campaigns: number;
  };
  /** Order count keyed by status; every status in ORDER_STATUSES is present (>= 0). */
  ordersByStatus: Record<OrderStatus, number>;
  recentOrders: RecentOrder[];
}

/**
 * Gather the admin dashboard snapshot in one parallel batch.
 *
 * `ordersByStatus` is derived from a groupBy and back-filled to zero for any status
 * with no rows, so the dashboard can iterate ORDER_STATUSES without guarding undefined.
 */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  const [
    products,
    orders,
    brands,
    notes,
    users,
    campaigns,
    statusGroups,
    recentOrders,
  ] = await Promise.all([
    db.product.count(),
    db.order.count(),
    db.brand.count(),
    db.note.count(),
    db.user.count(),
    db.campaign.count(),
    db.order.groupBy({ by: ['status'], _count: { _all: true } }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, number: true, status: true, total: true, createdAt: true },
    }),
  ]);

  const ordersByStatus = ORDER_STATUSES.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<OrderStatus, number>,
  );
  for (const group of statusGroups) {
    if ((ORDER_STATUSES as readonly string[]).includes(group.status)) {
      ordersByStatus[group.status as OrderStatus] = group._count._all;
    }
  }

  return {
    counts: { products, orders, brands, notes, users, campaigns },
    ordersByStatus,
    recentOrders,
  };
}
