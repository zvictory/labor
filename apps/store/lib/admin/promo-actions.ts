'use server';

// Admin promo code actions. Plain form posts: a validation failure comes back
// to the list page as ?error=<code> so the page needs no client state.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireStaff } from '@/lib/admin/guard';
import { db } from '@/lib/db';
import { normalizePromoCode } from '@/lib/promo/rules';

const optionalInt = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0), 'invalid_number');

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : new Date(`${v}T00:00:00+05:00`)))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), 'invalid_date');

const createSchema = z
  .object({
    code: z.string().transform((v, ctx) => {
      const code = normalizePromoCode(v);
      if (!code) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid_code' });
        return z.NEVER;
      }
      return code;
    }),
    kind: z.enum(['percent', 'fixed']),
    value: z.coerce.number().int().positive('invalid_value'),
    minSubtotal: optionalInt,
    maxUses: optionalInt,
    firstOrderOnly: z.boolean(),
    startsAt: optionalDate,
    // An end date covers the whole day in Tashkent.
    endsAt: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : new Date(`${v}T23:59:59+05:00`)))
      .refine((v) => v === null || !Number.isNaN(v.getTime()), 'invalid_date'),
    note: z.string().trim().max(200),
  })
  .refine((v) => v.kind !== 'percent' || v.value <= 100, { message: 'invalid_value' });

const base = (locale: string) => `/${locale}/admin/promo`;

export async function createPromoCode(formData: FormData): Promise<void> {
  await requireStaff();
  const locale = String(formData.get('locale') ?? 'ru');

  const parsed = createSchema.safeParse({
    code: String(formData.get('code') ?? ''),
    kind: formData.get('kind'),
    value: formData.get('value'),
    minSubtotal: String(formData.get('minSubtotal') ?? ''),
    maxUses: String(formData.get('maxUses') ?? ''),
    firstOrderOnly: formData.get('firstOrderOnly') === 'on',
    startsAt: String(formData.get('startsAt') ?? ''),
    endsAt: String(formData.get('endsAt') ?? ''),
    note: String(formData.get('note') ?? ''),
  });
  if (!parsed.success) {
    redirect(`${base(locale)}?error=${parsed.error.issues[0]?.message ?? 'invalid_input'}`);
  }

  const v = parsed.data;
  try {
    await db.promoCode.create({
      data: {
        code: v.code,
        kind: v.kind,
        value: v.value,
        minSubtotal: v.minSubtotal ?? 0,
        maxUses: v.maxUses,
        firstOrderOnly: v.firstOrderOnly,
        startsAt: v.startsAt,
        endsAt: v.endsAt,
        note: v.note || null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      redirect(`${base(locale)}?error=duplicate_code`);
    }
    throw err;
  }

  revalidatePath('/[locale]/admin/promo', 'page');
  redirect(base(locale));
}

const toggleSchema = z.object({
  id: z.coerce.number().int().positive(),
  active: z.enum(['true', 'false']),
});

export async function setPromoActive(formData: FormData): Promise<void> {
  await requireStaff();
  const parsed = toggleSchema.safeParse({ id: formData.get('id'), active: formData.get('active') });
  if (!parsed.success) return;
  await db.promoCode.update({
    where: { id: parsed.data.id },
    data: { active: parsed.data.active === 'true' },
  });
  revalidatePath('/[locale]/admin/promo', 'page');
}
