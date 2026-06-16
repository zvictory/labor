// POST /api/delivery/quote — returns a display-only delivery estimate for the
// checkout UI. Server-side so the Yandex token never reaches the client.
//
// Best-effort contract: getDeliveryEstimate() never throws and falls back to the
// static method baseFee (source 'method'). On malformed input we 400; on any
// unexpected error we still answer 200 with a method fallback so the checkout UI
// never sees an error from the estimate island.

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getDeliveryEstimate } from '@/lib/delivery/quote';

const quoteRequestSchema = z.object({
  region: z.string().trim().min(1),
  district: z.string().trim().optional(),
  address: z.string().trim().optional(),
  method: z.string().trim().min(1),
  locale: z.enum(['ru', 'uz', 'en']).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const { region, district, address, method } = parsed.data;

  try {
    const estimate = await getDeliveryEstimate({ region, district, address, method });
    return NextResponse.json(estimate);
  } catch {
    // getDeliveryEstimate is best-effort and shouldn't throw, but never leak a
    // provider error: answer with a method fallback (fee resolved server-side).
    const fallback = await getDeliveryEstimate({ region, method }).catch(() => ({
      method,
      fee: 0,
      source: 'method' as const,
    }));
    return NextResponse.json(fallback);
  }
}
