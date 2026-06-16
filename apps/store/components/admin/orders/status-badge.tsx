// Status pills for the admin order views. Pure presentational server components —
// no client state. Labels are ru-primary (admin console convention); colors map
// the lifecycle/payment vocabulary to the bone/ink/brass-adjacent palette.

import type { OrderStatus, OrderPaymentStatus } from '@/lib/orders/queries';

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждён',
  paid: 'Оплачен',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  canceled: 'Отменён',
};

const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'border-amber-300 bg-amber-50 text-amber-800',
  confirmed: 'border-sky-300 bg-sky-50 text-sky-800',
  paid: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  shipped: 'border-indigo-300 bg-indigo-50 text-indigo-800',
  delivered: 'border-green-400 bg-green-50 text-green-800',
  canceled: 'border-stone-300 bg-stone-100 text-stone-600',
};

const PAYMENT_STATUS_LABEL: Record<OrderPaymentStatus, string> = {
  unpaid: 'Не оплачен',
  paid: 'Оплачен',
  refunded: 'Возвращён',
};

const PAYMENT_STATUS_CLASS: Record<OrderPaymentStatus, string> = {
  unpaid: 'border-stone-300 bg-stone-100 text-stone-600',
  paid: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  refunded: 'border-rose-300 bg-rose-50 text-rose-800',
};

const baseCls =
  'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`${baseCls} ${ORDER_STATUS_CLASS[status]}`}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: OrderPaymentStatus }) {
  return (
    <span className={`${baseCls} ${PAYMENT_STATUS_CLASS[status]}`}>
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}

export { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL };
