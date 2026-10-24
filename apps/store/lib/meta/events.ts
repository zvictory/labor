// The two server events the shop sends to Meta (lib/meta/capi.ts). Each reads
// the request now and sends after the response, so Meta's latency never
// reaches the buyer. Both do nothing until the Conversions API is configured,
// and neither throws: the order or request is already stored when they run.

import { after } from 'next/server';
import type { Order } from '@prisma/client';

import type { Attribution } from '@/lib/attribution/attribution';
import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/seo';
import { capiConfig, sendCapiEvent } from './capi';
import { readCapiVisitor, readSourceUrl } from './visitor';

export const reportPurchase = async (
  order: Pick<Order, 'id' | 'number' | 'total' | 'phone' | 'userId' | 'createdAt'>,
  ctx: { locale: string; attribution: Attribution | null },
): Promise<void> => {
  const config = capiConfig();
  if (!config) return;
  try {
    const visitor = await readCapiVisitor(ctx.attribution);
    after(async () => {
      const items = await db.orderItem.findMany({
        where: { orderId: order.id },
        select: { productId: true, quantity: true },
      });
      await sendCapiEvent(
        {
          eventName: 'Purchase',
          eventId: order.number,
          eventTime: order.createdAt,
          sourceUrl: `${SITE_URL}/${ctx.locale}/checkout`,
          phone: order.phone,
          externalId: order.userId ? String(order.userId) : null,
          visitor,
          customData: {
            value: order.total,
            currency: 'UZS',
            order_id: order.number,
            content_type: 'product',
            content_ids: [...new Set(items.map((i) => String(i.productId)))],
            num_items: items.reduce((n, i) => n + i.quantity, 0),
          },
        },
        config,
      );
    });
  } catch (err) {
    console.error('[meta:capi] Purchase not sent:', err);
  }
};

export const reportLead = async (lead: {
  eventId: string;
  phone: string;
  source: string;
  locale: string;
  attribution: Attribution | null;
}): Promise<void> => {
  const config = capiConfig();
  if (!config) return;
  try {
    const [visitor, sourceUrl] = await Promise.all([
      readCapiVisitor(lead.attribution),
      readSourceUrl(`${SITE_URL}/${lead.locale}`),
    ]);
    const eventTime = new Date();
    after(() =>
      sendCapiEvent(
        {
          eventName: 'Lead',
          eventId: lead.eventId,
          eventTime,
          sourceUrl,
          phone: lead.phone,
          externalId: null,
          visitor,
          customData: { content_category: lead.source },
        },
        config,
      ),
    );
  } catch (err) {
    console.error('[meta:capi] Lead not sent:', err);
  }
};
