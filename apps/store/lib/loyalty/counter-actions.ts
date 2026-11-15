'use server';

// The branch till: staff find a member by card number (scanned or typed) or by
// phone, record a purchase (bonus used and earned), and sign up a new member by
// phone with a one-time SMS code. Staff and admin roles only.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireStaff } from '@/lib/admin/guard';
import { OtpError, requestOtp, verifyOtp } from '@/lib/auth/otp';
import { db } from '@/lib/db';
import { normalizeUzPhone } from '@/lib/phone';
import { STORE_CONTACT } from '@/lib/store-contact';
import {
  counterPurchase,
  ensureAccount,
  getLoyaltyState,
  LoyaltyError,
} from '@/lib/loyalty/loyalty';
import { notifyEarned } from '@/lib/loyalty/notify';
import { syncWalletPasses } from '@/lib/wallet/google/sync';
import { parseCardNumber, type Tier } from '@/lib/loyalty/rules';

export interface CounterMember {
  accountId: number;
  cardNumber: string;
  name: string | null;
  /** The last four digits only: the till screen faces the customer. */
  phoneTail: string | null;
  tier: Tier;
  rate: number;
  available: number;
  hasBirthDate: boolean;
}

export type CounterResult<T> = { ok: true; data: T } | { ok: false; error: string };

const memberOf = async (accountId: number): Promise<CounterMember> => {
  const account = await db.loyaltyAccount.findUniqueOrThrow({
    where: { id: accountId },
    select: { user: { select: { name: true, phone: true, birthDate: true } } },
  });
  const state = await getLoyaltyState(accountId);
  return {
    accountId,
    cardNumber: state.cardNumber,
    name: account.user.name,
    phoneTail: account.user.phone ? account.user.phone.slice(-4) : null,
    tier: state.tier,
    rate: state.rate,
    available: state.available,
    hasBirthDate: account.user.birthDate !== null,
  };
};

/** A card number (any spacing) or a phone number. */
export async function findMember(query: string): Promise<CounterResult<CounterMember>> {
  await requireStaff();
  const card = parseCardNumber(query);
  if (card) {
    const account = await db.loyaltyAccount.findUnique({
      where: { cardNumber: card },
      select: { id: true },
    });
    return account
      ? { ok: true, data: await memberOf(account.id) }
      : { ok: false, error: 'not_found' };
  }
  const phone = normalizeUzPhone(query);
  if (phone) {
    const user = await db.user.findUnique({ where: { phone }, select: { id: true, role: true } });
    if (!user || user.role !== 'customer') return { ok: false, error: 'not_found' };
    const account = await ensureAccount(user.id);
    return { ok: true, data: await memberOf(account.id) };
  }
  return { ok: false, error: 'query_invalid' };
}

const purchaseSchema = z.object({
  accountId: z.number().int().positive(),
  branch: z.enum(STORE_CONTACT.branches.map((b) => b.id) as [string, ...string[]]),
  purchase: z.number().int().positive(),
  spend: z.number().int().min(0),
});

export async function recordPurchase(
  input: z.input<typeof purchaseSchema>,
): Promise<CounterResult<{ earned: number; spent: number; balance: number }>> {
  const staff = await requireStaff();
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'input_invalid' };
  try {
    const result = await counterPurchase({ ...parsed.data, staffUserId: staff.id });
    const account = await db.loyaltyAccount.findUnique({
      where: { id: parsed.data.accountId },
      select: { userId: true },
    });
    if (account && result.earned > 0) {
      await notifyEarned(account.userId, result.earned, result.balance).catch(() => undefined);
    }
    syncWalletPasses(parsed.data.accountId, result.earned > 0 ? 'earn' : 'spend');
    revalidatePath('/[locale]/admin/loyalty', 'page');
    return { ok: true, data: result };
  } catch (err) {
    if (err instanceof LoyaltyError) return { ok: false, error: err.code };
    console.error('[counter] recordPurchase failed:', err);
    return { ok: false, error: 'unexpected' };
  }
}

/** Step 1 of signing up at the till: an SMS code to the customer's phone. */
export async function sendSignupCode(rawPhone: string): Promise<CounterResult<{ phone: string }>> {
  await requireStaff();
  const phone = normalizeUzPhone(rawPhone);
  if (!phone) return { ok: false, error: 'phone_invalid' };
  try {
    await requestOtp(phone);
    return { ok: true, data: { phone } };
  } catch (err) {
    if (err instanceof OtpError) return { ok: false, error: err.code };
    console.error('[counter] sendSignupCode failed:', err);
    return { ok: false, error: 'unexpected' };
  }
}

const signupSchema = z.object({
  phone: z.string(),
  code: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/),
  name: z.string().trim().max(80).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  consent: z.boolean(),
});

/**
 * Step 2: the code the customer reads out. Finds or creates the account for the
 * phone (the same one a later sign-in on the site uses) and opens the card.
 */
export async function confirmSignup(
  input: z.input<typeof signupSchema>,
): Promise<CounterResult<CounterMember>> {
  await requireStaff();
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'input_invalid' };
  const phone = normalizeUzPhone(parsed.data.phone);
  if (!phone) return { ok: false, error: 'phone_invalid' };

  const verified = await verifyOtp(phone, parsed.data.code);
  if (!verified) return { ok: false, error: 'code_invalid' };

  const user = await db.user.findUniqueOrThrow({
    where: { id: verified.userId },
    select: { id: true, name: true, birthDate: true, role: true },
  });
  if (user.role !== 'customer') return { ok: false, error: 'not_customer' };

  const birth = parsed.data.birthDate ? new Date(`${parsed.data.birthDate}T00:00:00Z`) : null;
  await db.user.update({
    where: { id: user.id },
    data: {
      ...(!user.name && parsed.data.name ? { name: parsed.data.name } : {}),
      // Only fills an empty date, as on the site.
      ...(!user.birthDate && birth && !Number.isNaN(birth.getTime()) && birth <= new Date()
        ? { birthDate: birth }
        : {}),
    },
  });
  const account = await ensureAccount(user.id);
  if (parsed.data.consent) {
    await db.loyaltyAccount.update({
      where: { id: account.id },
      data: { marketingConsentAt: new Date(), marketingConsentSource: 'branch' },
    });
  }
  return { ok: true, data: await memberOf(account.id) };
}
