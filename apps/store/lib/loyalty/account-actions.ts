'use server';

// What a member changes about their own card from the account page: the date of
// birth (once; a wrong one is corrected by staff, so the birthday bonus cannot
// be moved around) and the consent to promotional messages.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ensureAccount } from '@/lib/loyalty/loyalty';

export type AccountActionResult = { ok: true } | { ok: false; error: string };

const birthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((s) => new Date(`${s}T00:00:00Z`))
  .refine((d) => !Number.isNaN(d.getTime()), 'invalid')
  .refine((d) => {
    const year = d.getUTCFullYear();
    return year >= 1920 && d.getTime() <= Date.now();
  }, 'invalid');

export async function setBirthDate(raw: string): Promise<AccountActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'unauthorized' };
  const parsed = birthSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'birth_invalid' };
  // Only fills an empty date.
  const done = await db.user.updateMany({
    where: { id: user.id, birthDate: null },
    data: { birthDate: parsed.data },
  });
  if (done.count === 0) return { ok: false, error: 'birth_set' };
  revalidatePath('/[locale]/account', 'page');
  return { ok: true };
}

export async function setMarketingConsent(consent: boolean): Promise<AccountActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'unauthorized' };
  const account = await ensureAccount(user.id);
  await db.loyaltyAccount.update({
    where: { id: account.id },
    data: consent
      ? { marketingConsentAt: new Date(), marketingConsentSource: 'site' }
      : { marketingConsentAt: null, marketingConsentSource: null },
  });
  revalidatePath('/[locale]/account', 'page');
  return { ok: true };
}
