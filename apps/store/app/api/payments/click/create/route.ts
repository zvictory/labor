// POST /api/payments/click/create — issue a Click hosted-pay redirect URL.
//
// Body: { orderNumber: string }. Resolves the order by its public number,
// rejects if already paid, and returns { paymentUrl }. No webhook/idempotency
// here (that's the webhook route) — this is just URL construction.
//
// TODO(P3): add ownership/auth check (only the order's owner may request a pay
// URL) once Auth.js session is wired.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createClickPaymentUrl } from '@/lib/payments/click';

interface CreateBody {
  orderNumber?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let parsed: CreateBody;
  try {
    parsed = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const orderNumber = parsed.orderNumber;
  if (!orderNumber) {
    return NextResponse.json({ error: 'orderNumber is required' }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { number: orderNumber },
    select: { id: true, number: true, total: true, paymentStatus: true },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.paymentStatus === 'paid') {
    return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
  }

  try {
    const paymentUrl = createClickPaymentUrl({
      orderId: order.id,
      orderNumber: order.number,
      amount: order.total,
    });
    return NextResponse.json({ paymentUrl });
  } catch (err) {
    console.error('[click:create]', err);
    return NextResponse.json({ error: 'Failed to build payment URL' }, { status: 500 });
  }
}
