// Messages to Google Wallet card holders: to a segment from /admin/wallet, or
// to one member from their admin page. Only members who agreed to promotional
// messages, and only within the allowance (lib/wallet/quota.ts). Each message
// goes to each card separately, so segments and the allowance are respected.

import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/seo';
import { addDays, spendLast12Months, tierFor } from '@/lib/loyalty/rules';
import { readGoogleWalletConfig } from '@/lib/wallet/google/config';
import { addObjectMessage, GoogleWalletError } from '@/lib/wallet/google/client';
import { buildMessage } from '@/lib/wallet/google/pass';
import { canNotify } from '@/lib/wallet/quota';

export type Segment = 'all' | 'silver' | 'gold' | 'lapsed';
export const SEGMENTS: readonly Segment[] = ['all', 'silver', 'gold', 'lapsed'];

/** A link on the message must lead to Labor's own site; it gets the wallet tags. */
export const walletLink = (raw: string | null | undefined, campaign: string): string | null => {
  const value = raw?.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value, SITE_URL);
  } catch {
    return null;
  }
  if (url.origin !== new URL(SITE_URL).origin) return null;
  url.searchParams.set('utm_source', 'wallet');
  url.searchParams.set('utm_medium', 'google');
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
};

const entrySelect = {
  kind: true,
  amount: true,
  purchaseAmount: true,
  createdAt: true,
  expiresAt: true,
  lotId: true,
  id: true,
} as const;

/** The Google cards a segment reaches: consent given, and in the segment. */
const segmentPasses = async (segment: Segment, now: Date) => {
  const passes = await db.walletPass.findMany({
    where: { platform: 'google', account: { marketingConsentAt: { not: null } } },
    select: {
      id: true,
      objectId: true,
      hasUsers: true,
      notifications: {
        where: { createdAt: { gte: addDays(now, -7) } },
        select: { kind: true, createdAt: true },
      },
      account: { select: { id: true, entries: { select: entrySelect } } },
    },
  });
  return passes.filter((p) => {
    const entries = p.account.entries;
    if (segment === 'all') return true;
    if (segment === 'lapsed') {
      const lastEarn = entries
        .filter((e) => e.kind === 'earn')
        .reduce<Date | null>((d, e) => (!d || e.createdAt > d ? e.createdAt : d), null);
      return lastEarn !== null && lastEarn < addDays(now, -60);
    }
    const tier = tierFor(spendLast12Months(entries, now)).tier;
    return segment === 'gold' ? tier === 'gold' : tier === 'silver' || tier === 'gold';
  });
};

export interface CampaignPreview {
  eligible: number;
  saved: number;
  withinAllowance: number;
}

export const previewCampaign = async (
  segment: Segment,
  now = new Date(),
): Promise<CampaignPreview> => {
  const passes = await segmentPasses(segment, now);
  return {
    eligible: passes.length,
    saved: passes.filter((p) => p.hasUsers).length,
    withinAllowance: passes.filter((p) => canNotify(p.notifications, 'promo', now)).length,
  };
};

export const sendCampaign = async (input: {
  header: string;
  body: string;
  link: string | null;
  segment: Segment;
  staffUserId: number;
}): Promise<{ id: number; eligible: number; sent: number; skipped: number; failed: number }> => {
  const cfg = readGoogleWalletConfig();
  if (!cfg) throw new Error('google_wallet_off');
  const now = new Date();
  const passes = await segmentPasses(input.segment, now);
  const row = await db.walletMessage.create({
    data: {
      header: input.header,
      body: input.body,
      link: input.link,
      segment: input.segment,
      eligible: passes.length,
      staffUserId: input.staffUserId,
    },
  });
  const link = walletLink(input.link, `wallet_${row.id}`);
  const message = buildMessage({
    id: `labor_${row.id}`,
    header: input.header,
    body: input.body,
    link,
  });
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const pass of passes) {
    if (!canNotify(pass.notifications, 'promo', now)) {
      skipped += 1;
      continue;
    }
    try {
      await addObjectMessage(cfg, pass.objectId, message);
      await db.walletNotification.create({
        data: { passId: pass.id, kind: 'promo', messageId: row.id },
      });
      sent += 1;
    } catch (err) {
      if (err instanceof GoogleWalletError && err.quotaExceeded) skipped += 1;
      else {
        failed += 1;
        console.error('[wallet/google] message failed:', err);
      }
    }
  }
  await db.walletMessage.update({ where: { id: row.id }, data: { sent, skipped, failed } });
  return { id: row.id, eligible: passes.length, sent, skipped, failed };
};

/** One member's Google card. Kept with their Telegram messages in LoyaltyMessage. */
export const sendPersonalWalletMessage = async (input: {
  accountId: number;
  header: string;
  body: string;
  staffUserId: number;
}): Promise<'sent' | 'no_pass' | 'no_consent' | 'quota' | 'failed' | 'off'> => {
  const cfg = readGoogleWalletConfig();
  if (!cfg) return 'off';
  const now = new Date();
  const pass = await db.walletPass.findUnique({
    where: { accountId_platform: { accountId: input.accountId, platform: 'google' } },
    select: {
      id: true,
      objectId: true,
      account: { select: { marketingConsentAt: true } },
      notifications: {
        where: { createdAt: { gte: addDays(now, -7) } },
        select: { kind: true, createdAt: true },
      },
    },
  });
  if (!pass) return 'no_pass';
  if (!pass.account.marketingConsentAt) return 'no_consent';
  if (!canNotify(pass.notifications, 'personal', now)) return 'quota';
  let status: 'sent' | 'quota' | 'failed' = 'sent';
  try {
    await addObjectMessage(
      cfg,
      pass.objectId,
      buildMessage({ id: `personal_${Date.now()}`, header: input.header, body: input.body }),
    );
    await db.walletNotification.create({ data: { passId: pass.id, kind: 'personal' } });
  } catch (err) {
    status = err instanceof GoogleWalletError && err.quotaExceeded ? 'quota' : 'failed';
    if (status === 'failed') console.error('[wallet/google] personal message failed:', err);
  }
  await db.loyaltyMessage.create({
    data: {
      accountId: input.accountId,
      channel: 'google_wallet',
      text: `${input.header}\n${input.body}`,
      status,
      staffUserId: input.staffUserId,
    },
  });
  return status;
};

export const listCampaigns = () =>
  db.walletMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 30 });

export const walletStats = async () => {
  const [passes, saved] = await Promise.all([
    db.walletPass.count({ where: { platform: 'google' } }),
    db.walletPass.count({ where: { platform: 'google', hasUsers: true } }),
  ]);
  return { passes, saved };
};
