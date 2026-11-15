'use server';

// Admin actions for Google Wallet messages: preview a segment, send to it, and
// send to one member. Staff may preview; sending to a segment is admin-only.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { isAdmin, requireStaff } from '@/lib/admin/guard';
import {
  previewCampaign,
  sendCampaign,
  sendPersonalWalletMessage,
  SEGMENTS,
  walletLink,
  type CampaignPreview,
  type Segment,
} from '@/lib/wallet/google/messages';
import { MESSAGE_BODY_MAX, MESSAGE_HEADER_MAX } from '@/lib/wallet/google/pass';

const segmentSchema = z.enum(SEGMENTS as unknown as [Segment, ...Segment[]]);

export async function previewWalletSegment(segment: string): Promise<CampaignPreview | null> {
  await requireStaff();
  const parsed = segmentSchema.safeParse(segment);
  return parsed.success ? previewCampaign(parsed.data) : null;
}

const campaignSchema = z.object({
  header: z.string().trim().min(2).max(MESSAGE_HEADER_MAX),
  body: z.string().trim().min(2).max(MESSAGE_BODY_MAX),
  link: z.string().trim().max(300).optional(),
  segment: segmentSchema,
});

export type WalletActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function sendWalletCampaign(
  input: z.input<typeof campaignSchema>,
): Promise<
  WalletActionResult<{ sent: number; skipped: number; failed: number; eligible: number }>
> {
  const staff = await requireStaff();
  if (!isAdmin(staff)) return { ok: false, error: 'admin_only' };
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'input_invalid' };
  if (parsed.data.link && !walletLink(parsed.data.link, 'check'))
    return { ok: false, error: 'link_invalid' };
  try {
    const r = await sendCampaign({
      ...parsed.data,
      link: parsed.data.link || null,
      staffUserId: staff.id,
    });
    revalidatePath('/[locale]/admin/wallet', 'page');
    return { ok: true, data: r };
  } catch (err) {
    if (err instanceof Error && err.message === 'google_wallet_off')
      return { ok: false, error: 'off' };
    console.error('[wallet/google] campaign failed:', err);
    return { ok: false, error: 'unexpected' };
  }
}

const personalSchema = z.object({
  accountId: z.number().int().positive(),
  header: z.string().trim().min(2).max(MESSAGE_HEADER_MAX),
  body: z.string().trim().min(2).max(MESSAGE_BODY_MAX),
});

export async function sendWalletPersonal(
  input: z.input<typeof personalSchema>,
): Promise<WalletActionResult> {
  const staff = await requireStaff();
  const parsed = personalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'input_invalid' };
  const status = await sendPersonalWalletMessage({ ...parsed.data, staffUserId: staff.id });
  revalidatePath('/[locale]/admin/loyalty', 'layout');
  return status === 'sent' ? { ok: true, data: undefined } : { ok: false, error: status };
}
