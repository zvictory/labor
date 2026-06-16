// Pure transition logic for admin order status changes. Kept SEPARATE from
// order-actions.ts because that file is a 'use server' module (which may only
// export async functions) — this module exports the sync predicate + types that
// both the server actions and the client UI import to agree on what's legal.
//
// Status vocabulary (hard contract, shared with payment-state.ts / schema.prisma):
//   Order.status: pending | confirmed | paid | shipped | delivered | canceled
//
// Manual operator transitions (distinct from webhook payment moves):
//   confirm: pending           -> confirmed
//   ship:    confirmed | paid   -> shipped
//   deliver: shipped            -> delivered
//   cancel:  any non-delivered  -> canceled   (delivered & canceled are terminal)

export type AdminOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'canceled';

export const ORDER_STATUSES: readonly AdminOrderStatus[] = [
  'pending',
  'confirmed',
  'paid',
  'shipped',
  'delivered',
  'canceled',
];

/**
 * Legal manual transitions. Read as: from KEY you may move to any status in the
 * VALUE set. Only operator-driven fulfillment moves are covered — payment-driven
 * moves (-> 'paid') are owned by the webhook state machine, so 'paid' appears here
 * only as a SHIP source, never a manual target.
 */
export const LEGAL_TRANSITIONS: Record<AdminOrderStatus, ReadonlySet<AdminOrderStatus>> = {
  pending: new Set(['confirmed', 'canceled']),
  confirmed: new Set(['shipped', 'canceled']),
  paid: new Set(['shipped', 'canceled']),
  shipped: new Set(['delivered', 'canceled']),
  delivered: new Set([]), // terminal
  canceled: new Set([]), // terminal
};

export const isAdminOrderStatus = (value: string): value is AdminOrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(value);

/**
 * Whether moving `from` -> `to` is a legal manual transition. Pure predicate,
 * reused by the UI to decide which action buttons to enable and by the server
 * actions to reject illegal moves.
 */
export function canTransition(from: string, to: string): boolean {
  if (!isAdminOrderStatus(from) || !isAdminOrderStatus(to)) return false;
  return LEGAL_TRANSITIONS[from].has(to);
}

/** Result returned to the calling client island by an order action. */
export type OrderActionResult =
  | { ok: true; status: AdminOrderStatus }
  | { ok: false; error: string };
