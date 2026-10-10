// Promo code storage: lookup, the first-order test, and the usage counter.
// The rules themselves are in lib/promo/rules.ts.

import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { normalizePromoCode, type PromoRule } from '@/lib/promo/rules';

type Tx = Prisma.TransactionClient;

export const findPromo = async (raw: string): Promise<(PromoRule & { id: number }) | null> => {
  const code = normalizePromoCode(raw);
  if (!code) return null;
  return db.promoCode.findUnique({ where: { code } });
};

/**
 * True when neither the account nor the phone number has an order that was not
 * cancelled. Phones are compared by digits: the order stores what was typed,
 * so "+998 90 123-45-67" and "998901234567" are the same customer.
 */
export const isFirstOrder = async (who: { userId?: number; phone?: string }): Promise<boolean> => {
  const raw = who.phone?.replace(/\D/g, '') ?? '';
  // Compare the last nine digits (the local number) only when there are nine.
  const digits = raw.length >= 9 ? raw : '';
  if (!who.userId && !digits) return true;
  const rows = await db.$queryRaw<{ found: number }[]>`
    SELECT 1 AS found FROM "Order"
    WHERE status <> 'canceled'
      AND (
        (${who.userId ?? null}::int IS NOT NULL AND "userId" = ${who.userId ?? null}::int)
        OR (${digits}::text <> '' AND right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 9) = right(${digits}::text, 9))
      )
    LIMIT 1`;
  return rows.length === 0;
};

/**
 * Count one use, inside the order's transaction. Returns false when the code
 * ran out (or was switched off) between the check and the order: the
 * condition is evaluated by the database, so two buyers cannot both take the
 * last use.
 */
export const claimPromoUse = async (tx: Tx, promoId: number): Promise<boolean> => {
  const updated = await tx.$executeRaw`
    UPDATE "PromoCode"
    SET "usedCount" = "usedCount" + 1, "updatedAt" = NOW()
    WHERE id = ${promoId}
      AND active
      AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
  return updated === 1;
};

/**
 * The first-order code to advertise (the bot's /start), if one is live: the
 * newest switched-on, in-date, not used-up first-order code.
 */
export const liveFirstOrderCode = async (now: Date = new Date()): Promise<string | null> => {
  const rows = await db.promoCode.findMany({
    where: {
      active: true,
      firstOrderOnly: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { code: true, maxUses: true, usedCount: true },
  });
  return rows.find((r) => r.maxUses === null || r.usedCount < r.maxUses)?.code ?? null;
};
