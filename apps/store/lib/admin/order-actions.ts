'use server';

// Admin order status actions. These are the MANUAL operator transitions performed
// from the admin console — distinct from the webhook-driven moves in
// lib/orders/payment-state.ts (which we must NOT touch). Each action:
//   - guards on requireStaff() first;
//   - validates the requested current->next transition against the legal matrix
//     (canTransition, in lib/admin/order-transitions.ts), so an out-of-order click
//     is rejected rather than corrupting state;
//   - is idempotent: if the order is ALREADY in the target status, it's a no-op
//     success (no DB write, no notify), so a double-click / retry never double-fires;
//   - updates Order.status (and, where relevant, paymentStatus) transactionally;
//   - notifies the customer/admin over Telegram best-effort (try/catch) AFTER the
//     commit — a notify failure never blocks or rolls back the status change.
//
// NOTE: this is a 'use server' module, so it may export ONLY async functions. The
// sync predicate (canTransition), the legal matrix, and the shared types live in
// lib/admin/order-transitions.ts and are re-exported via that module for the UI.
//
// Status vocabulary (hard contract, shared with payment-state.ts / schema.prisma):
//   Order.status:        pending | confirmed | paid | shipped | delivered | canceled
//   Order.paymentStatus: unpaid | paid | refunded
//
// Money is integer UZS minor units throughout; not relevant here (no totals change).

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { requireStaff } from '@/lib/admin/guard';
import {
  canTransition,
  type AdminOrderStatus,
  type OrderActionResult,
} from '@/lib/admin/order-transitions';

const numberSchema = z.string().trim().min(1);
const reasonSchema = z.string().trim().max(500).optional();

/**
 * Core transition engine shared by every action. Loads the order, short-circuits
 * idempotently when it's already in `target`, validates the transition, applies it
 * (with any paymentStatus side-effect computed by `paymentStatusFor`), then fires a
 * best-effort Telegram notification and revalidates the admin order views.
 */
async function applyTransition(
  rawNumber: string,
  target: AdminOrderStatus,
  paymentStatusFor?: (current: { paymentStatus: string }) => string | undefined,
): Promise<OrderActionResult> {
  await requireStaff();

  const parsed = numberSchema.safeParse(rawNumber);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_number' };
  }
  const number = parsed.data;

  // Run the read + guarded write in one transaction so two concurrent operators
  // can't both pass the guard against a stale status.
  const outcome = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { number },
      select: { id: true, status: true, paymentStatus: true },
    });
    if (!order) return { kind: 'not_found' as const };

    // Idempotent no-op: already in the target status.
    if (order.status === target) {
      return { kind: 'noop' as const };
    }

    if (!canTransition(order.status, target)) {
      return { kind: 'illegal' as const, from: order.status };
    }

    const nextPaymentStatus = paymentStatusFor?.({ paymentStatus: order.paymentStatus });

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: target,
        ...(nextPaymentStatus ? { paymentStatus: nextPaymentStatus } : {}),
      },
    });
    return { kind: 'updated' as const };
  });

  if (outcome.kind === 'not_found') return { ok: false, error: 'not_found' };
  if (outcome.kind === 'illegal') return { ok: false, error: 'illegal_transition' };

  // For both a real update and an idempotent no-op we revalidate so the UI is
  // consistent; we only NOTIFY on a real transition.
  if (outcome.kind === 'updated') {
    // Best-effort, post-commit. A notify failure must never surface as an action
    // error or roll anything back.
    try {
      const { notifyOrderStatus } = await import('@/lib/telegram/notify');
      await notifyOrderStatus(number, target);
    } catch (err) {
      console.error('[admin/order-actions] notifyOrderStatus failed:', err);
    }
  }

  revalidatePath('/[locale]/admin/orders', 'page');
  revalidatePath(`/[locale]/admin/orders/${number}`, 'page');

  return { ok: true, status: target };
}

/** pending -> confirmed. */
export async function confirmOrder(number: string): Promise<OrderActionResult> {
  return applyTransition(number, 'confirmed');
}

/** confirmed | paid -> shipped. */
export async function shipOrder(number: string): Promise<OrderActionResult> {
  return applyTransition(number, 'shipped');
}

/** shipped -> delivered. */
export async function deliverOrder(number: string): Promise<OrderActionResult> {
  return applyTransition(number, 'delivered');
}

/**
 * any non-delivered, non-canceled -> canceled.
 *
 * Payment side-effect: refunding a paid order is an out-of-band operation (the
 * provider refund is not wired here). We deliberately DO NOT flip paymentStatus to
 * 'refunded' automatically — that stays a no-op/TODO so the books reflect that the
 * money has not actually been returned yet. `reason` is accepted for the audit
 * trail / operator note but is not persisted (no column exists on Order).
 */
export async function cancelOrder(number: string, reason?: string): Promise<OrderActionResult> {
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success) {
    return { ok: false, error: 'invalid_reason' };
  }

  // TODO(refund): when a paid order is canceled, trigger the provider refund and
  // set Order.paymentStatus = 'refunded' on success. For now leave paymentStatus
  // untouched (no-op) so a cancel never falsely claims the money was returned.
  return applyTransition(number, 'canceled', () => undefined);
}
