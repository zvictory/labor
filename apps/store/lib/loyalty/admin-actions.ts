'use server';

// Admin actions on one member: a correction to the balance (admin role, with a
// reason) and a personal message (staff; needs the member's consent).

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { isAdmin, requireStaff } from '@/lib/admin/guard';
import { adjustBalance, LoyaltyError } from '@/lib/loyalty/loyalty';
import { sendPersonalMessage } from '@/lib/loyalty/notify';

export type AdminLoyaltyResult = { ok: true; message?: string } | { ok: false; error: string };

const adjustSchema = z.object({
  accountId: z.number().int().positive(),
  amount: z
    .number()
    .int()
    .refine((n) => n !== 0 && Math.abs(n) <= 10_000_000),
  note: z.string().trim().min(3).max(300),
});

export async function adjustMemberBalance(
  input: z.input<typeof adjustSchema>,
): Promise<AdminLoyaltyResult> {
  const staff = await requireStaff();
  if (!isAdmin(staff)) return { ok: false, error: 'admin_only' };
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'input_invalid' };
  try {
    await adjustBalance({ ...parsed.data, staffUserId: staff.id });
  } catch (err) {
    if (err instanceof LoyaltyError) return { ok: false, error: err.code };
    throw err;
  }
  revalidatePath('/[locale]/admin/loyalty', 'layout');
  return { ok: true };
}

const messageSchema = z.object({
  accountId: z.number().int().positive(),
  text: z.string().trim().min(2).max(1000),
});

export async function messageMember(
  input: z.input<typeof messageSchema>,
): Promise<AdminLoyaltyResult> {
  const staff = await requireStaff();
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'input_invalid' };
  const status = await sendPersonalMessage({ ...parsed.data, staffUserId: staff.id });
  revalidatePath('/[locale]/admin/loyalty', 'layout');
  return status === 'sent' ? { ok: true } : { ok: false, error: status };
}
